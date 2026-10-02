#include "HybridOneStorage.hpp"
#include "OneStorageDirectory.hpp"

#include <algorithm>
#include <atomic>
#include <cerrno>
#include <cstdint>
#include <cstring>
#include <fcntl.h>
#include <limits>
#include <mutex>
#include <stdexcept>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>
#include <unordered_map>

namespace margelo::nitro::one {

namespace {

// record layout, little endian: op (1 set, 2 remove), key length (u32), key
// utf8, then for a set the value length (u32) and value utf8. the file past
// the last record is zero, and a record's op byte is stored after its body,
// so a record cut short by a crash still reads as that zero tail.
constexpr uint8_t kSetOp = 1;
constexpr uint8_t kRemoveOp = 2;
constexpr size_t kMinCapacity = 64 * 1024;
constexpr size_t kCompactFloor = 64 * 1024;

[[noreturn]] void fail(const char* code, const std::string& message) {
  throw std::runtime_error(std::string(code) + ": Storage: " + message);
}

std::string lastError() {
  return std::strerror(errno);
}

size_t setSize(const std::string& key, const std::string& value) {
  return 9 + key.size() + value.size();
}

size_t removeSize(const std::string& key) {
  return 5 + key.size();
}

uint8_t* writeField(uint8_t* at, const std::string& text) {
  uint32_t length = static_cast<uint32_t>(text.size());
  at[0] = static_cast<uint8_t>(length);
  at[1] = static_cast<uint8_t>(length >> 8);
  at[2] = static_cast<uint8_t>(length >> 16);
  at[3] = static_cast<uint8_t>(length >> 24);
  std::memcpy(at + 4, text.data(), text.size());
  return at + 4 + text.size();
}

void checkKey(const std::string& key) {
  if (key.empty()) fail("E_STORAGE_INPUT", "key must be a non-empty string");
  if (key.size() > std::numeric_limits<uint32_t>::max()) fail("E_STORAGE_INPUT", "key is too large");
}

// writes zeros over [from, to) so the file's blocks exist before they are
// mapped: storing into a mapped hole on a full disk raises SIGBUS instead of
// returning an error.
bool zeroFill(int fd, size_t from, size_t to) {
  static const uint8_t zeros[16 * 1024] = {};
  while (from < to) {
    size_t chunk = std::min(sizeof(zeros), to - from);
    ssize_t written = pwrite(fd, zeros, chunk, static_cast<off_t>(from));
    if (written <= 0) return false;
    from += static_cast<size_t>(written);
  }
  return true;
}

class StorageLog {
 public:
  static StorageLog& shared() {
    static StorageLog log;
    return log;
  }

  std::optional<std::string> get(const std::string& key) {
    checkKey(key);
    std::lock_guard<std::mutex> guard(mutex_);
    open();
    auto found = entries_.find(key);
    if (found == entries_.end()) return std::nullopt;
    return found->second;
  }

  void set(const std::string& key, const std::string& value) {
    checkKey(key);
    if (value.size() > std::numeric_limits<uint32_t>::max()) fail("E_STORAGE_INPUT", "value is too large");
    std::lock_guard<std::mutex> guard(mutex_);
    open();
    size_t size = setSize(key, value);
    uint8_t* record = reserve(size);
    writeField(writeField(record + 1, key), value);
    commit(record, kSetOp, size);
    auto [entry, inserted] = entries_.try_emplace(key, value);
    if (!inserted) {
      live_ -= setSize(key, entry->second);
      entry->second = value;
    }
    live_ += size;
    compactIfNeeded();
  }

  void remove(const std::string& key) {
    checkKey(key);
    std::lock_guard<std::mutex> guard(mutex_);
    open();
    auto found = entries_.find(key);
    if (found == entries_.end()) return;
    size_t size = removeSize(key);
    uint8_t* record = reserve(size);
    writeField(record + 1, key);
    commit(record, kRemoveOp, size);
    live_ -= setSize(key, found->second);
    entries_.erase(found);
    compactIfNeeded();
  }

  std::vector<std::string> keys() {
    std::lock_guard<std::mutex> guard(mutex_);
    open();
    std::vector<std::string> result;
    result.reserve(entries_.size());
    for (const auto& entry : entries_) result.push_back(entry.first);
    return result;
  }

 private:
  std::mutex mutex_;
  std::unordered_map<std::string, std::string> entries_;
  std::string path_;
  int fd_ = -1;
  uint8_t* base_ = nullptr;
  size_t capacity_ = 0;
  size_t used_ = 0;
  size_t live_ = 0;

  void closeLog(int keep = -1) {
    if (base_ != nullptr) munmap(base_, capacity_);
    if (fd_ >= 0 && fd_ != keep) close(fd_);
    base_ = nullptr;
    fd_ = -1;
    capacity_ = 0;
  }

  static size_t pageAligned(size_t size) {
    size_t page = static_cast<size_t>(sysconf(_SC_PAGESIZE));
    return (std::max(size, kMinCapacity) + page - 1) / page * page;
  }

  // the body is stored before the op byte, and the compiler may not reorder
  // the two, so the process dying at any instruction leaves either a whole
  // record or a zero op byte.
  void commit(uint8_t* record, uint8_t op, size_t size) {
    std::atomic_signal_fence(std::memory_order_release);
    record[0] = op;
    used_ += size;
  }

  uint8_t* reserve(size_t size) {
    if (used_ + size > capacity_) remap(fd_, capacity_, pageAligned(std::max(capacity_ * 2, used_ + size)));
    return base_ + used_;
  }

  // maps the first `capacity` bytes of `fd`, whose file is `filled` bytes
  // long, zero filling the rest, and makes it the live log. if mapping fails
  // the store closes, so the next call replays whatever the disk holds. a
  // failure closes `fd` unless it is already the live log.
  void remap(int fd, size_t filled, size_t capacity) {
    if (capacity > filled && !zeroFill(fd, filled, capacity)) {
      std::string reason = lastError();
      ftruncate(fd, static_cast<off_t>(filled));
      if (fd != fd_) close(fd);
      fail("E_STORAGE_WRITE", "could not grow the log (" + reason + ")");
    }
    void* mapped = mmap(nullptr, capacity, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
    if (mapped == MAP_FAILED) {
      std::string reason = lastError();
      if (fd != fd_) close(fd);
      closeLog();
      fail("E_STORAGE_WRITE", "could not map the log (" + reason + ")");
    }
    closeLog(fd);
    fd_ = fd;
    base_ = static_cast<uint8_t*>(mapped);
    capacity_ = capacity;
  }

  // replays the log once per process. replay stops at the first zero or
  // malformed op byte, and everything after it is zeroed so a later append
  // never lands in front of a stale record.
  void open() {
    if (base_ != nullptr) return;
    if (path_.empty()) path_ = storageDirectory() + "/storage.log";
    int fd = ::open(path_.c_str(), O_RDWR | O_CREAT | O_CLOEXEC, 0644);
    if (fd < 0) fail("E_STORAGE_OPEN", "open failed (" + lastError() + ")");
    struct stat info;
    if (fstat(fd, &info) != 0) {
      std::string reason = lastError();
      close(fd);
      fail("E_STORAGE_OPEN", "stat failed (" + reason + ")");
    }
    size_t size = static_cast<size_t>(info.st_size);
    remap(fd, size, pageAligned(size));
    replay(size);
  }

  void replay(size_t size) {
    entries_.clear();
    live_ = 0;
    size_t offset = 0;
    auto field = [&](std::string& out) {
      if (size - offset < 4) return false;
      const uint8_t* at = base_ + offset;
      size_t length = static_cast<size_t>(at[0]) | static_cast<size_t>(at[1]) << 8 |
          static_cast<size_t>(at[2]) << 16 | static_cast<size_t>(at[3]) << 24;
      if (length > size - offset - 4) return false;
      out.assign(reinterpret_cast<const char*>(at + 4), length);
      offset += 4 + length;
      return true;
    };
    std::string key;
    std::string value;
    size_t valid = 0;
    while (offset < size) {
      uint8_t op = base_[offset++];
      if ((op != kSetOp && op != kRemoveOp) || !field(key)) break;
      if (op == kSetOp) {
        if (!field(value)) break;
        live_ += setSize(key, value);
        // try_emplace leaves `value` untouched when the key already exists.
        auto [entry, inserted] = entries_.try_emplace(key, std::move(value));
        if (!inserted) {
          live_ -= setSize(key, entry->second);
          entry->second = std::move(value);
        }
      } else {
        auto found = entries_.find(key);
        if (found != entries_.end()) {
          live_ -= setSize(key, found->second);
          entries_.erase(found);
        }
      }
      valid = offset;
    }
    used_ = valid;
    size_t end = size;
    while (end > valid && base_[end - 1] == 0) end--;
    if (end > valid) std::memset(base_ + valid, 0, end - valid);
  }

  // writes the live entries to a temporary file, syncs it, and renames it over
  // the log, so a crash during compaction leaves one whole log or the other.
  void compactIfNeeded() {
    if (used_ <= kCompactFloor || used_ <= live_ * 2) return;
    std::string snapshot(live_, '\0');
    uint8_t* at = reinterpret_cast<uint8_t*>(snapshot.data());
    for (const auto& entry : entries_) {
      at[0] = kSetOp;
      at = writeField(writeField(at + 1, entry.first), entry.second);
    }
    std::string staging = path_ + ".tmp";
    int fd = ::open(staging.c_str(), O_RDWR | O_CREAT | O_TRUNC | O_CLOEXEC, 0644);
    size_t written = 0;
    while (fd >= 0 && written < snapshot.size()) {
      ssize_t chunk = write(fd, snapshot.data() + written, snapshot.size() - written);
      if (chunk <= 0) break;
      written += static_cast<size_t>(chunk);
    }
    size_t capacity = pageAligned(live_ * 2);
    bool staged = fd >= 0 && written == snapshot.size() && zeroFill(fd, live_, capacity) && fsync(fd) == 0 &&
        rename(staging.c_str(), path_.c_str()) == 0;
    if (!staged) {
      std::string reason = lastError();
      if (fd >= 0) close(fd);
      unlink(staging.c_str());
      fail("E_STORAGE_WRITE", "compaction failed (" + reason + ")");
    }
    remap(fd, capacity, capacity);
    used_ = live_;
  }
};

} // namespace

std::optional<std::string> HybridOneStorage::getItem(const std::string& key) {
  return StorageLog::shared().get(key);
}

void HybridOneStorage::setItem(const std::string& key, const std::string& value) {
  StorageLog::shared().set(key, value);
}

void HybridOneStorage::removeItem(const std::string& key) {
  StorageLog::shared().remove(key);
}

std::vector<std::string> HybridOneStorage::getAllKeys() {
  return StorageLog::shared().keys();
}

} // namespace margelo::nitro::one
