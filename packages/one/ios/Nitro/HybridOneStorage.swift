import Foundation
import NitroModules

// app key-value storage. entries live in one process-wide dictionary, so a
// read never leaves memory. each write appends one record to a log file with
// a single write call, so it survives an app crash once the call returns,
// and the log is rewritten as a snapshot when it grows past twice the live
// data. every hybrid instance shares the one store, since two in-memory
// copies over the same log would lose writes.
final class HybridOneStorage: HybridOneStorageSpec {
  func getItem(key: String) throws -> String? {
    return try OneStorageLog.shared.get(key)
  }

  func setItem(key: String, value: String) throws {
    try OneStorageLog.shared.set(key, value)
  }

  func removeItem(key: String) throws {
    try OneStorageLog.shared.remove(key)
  }

  func getAllKeys() throws -> [String] {
    return try OneStorageLog.shared.keys()
  }
}

// record layout, little endian: op (1 set, 2 remove), key length (u32), key
// utf8, then for a set the value length (u32) and value utf8.
private final class OneStorageLog {
  static let shared = OneStorageLog()

  private static let setOp: UInt8 = 1
  private static let removeOp: UInt8 = 2
  private static let compactFloor = 64 * 1024

  private let lock = NSLock()
  private var entries: [String: String] = [:]
  private var fd: Int32 = -1
  private var record: [UInt8] = []
  private var logBytes = 0
  private var liveBytes = 0
  private let url: URL = {
    let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    return support.appendingPathComponent("One/storage.log")
  }()

  func get(_ key: String) throws -> String? {
    try Self.check(key)
    lock.lock()
    defer { lock.unlock() }
    try open()
    return entries[key]
  }

  func set(_ key: String, _ value: String) throws {
    try Self.check(key)
    lock.lock()
    defer { lock.unlock() }
    try open()
    record.removeAll(keepingCapacity: true)
    Self.append(&record, op: Self.setOp, key: key, value: value)
    try write(record)
    if let previous = entries.updateValue(value, forKey: key) {
      liveBytes -= Self.setSize(key, previous)
    }
    liveBytes += record.count
    try compactIfNeeded()
  }

  func remove(_ key: String) throws {
    try Self.check(key)
    lock.lock()
    defer { lock.unlock() }
    try open()
    guard let previous = entries[key] else { return }
    record.removeAll(keepingCapacity: true)
    Self.append(&record, op: Self.removeOp, key: key, value: nil)
    try write(record)
    entries.removeValue(forKey: key)
    liveBytes -= Self.setSize(key, previous)
    try compactIfNeeded()
  }

  func keys() throws -> [String] {
    lock.lock()
    defer { lock.unlock() }
    try open()
    return Array(entries.keys)
  }

  private static func check(_ key: String) throws {
    guard !key.isEmpty else {
      throw oneNativeError("E_STORAGE_INPUT", "Storage: key must be a non-empty string")
    }
  }

  private static func setSize(_ key: String, _ value: String) -> Int {
    return 9 + key.utf8.count + value.utf8.count
  }

  private static func append(_ bytes: inout [UInt8], op: UInt8, key: String, value: String?) {
    bytes.append(op)
    appendField(&bytes, key)
    if let value { appendField(&bytes, value) }
  }

  private static func appendField(_ bytes: inout [UInt8], _ text: String) {
    let length = UInt32(text.utf8.count)
    bytes.append(UInt8(truncatingIfNeeded: length))
    bytes.append(UInt8(truncatingIfNeeded: length >> 8))
    bytes.append(UInt8(truncatingIfNeeded: length >> 16))
    bytes.append(UInt8(truncatingIfNeeded: length >> 24))
    bytes.append(contentsOf: text.utf8)
  }

  // one write(2) per record: the bytes reach the kernel before the call
  // returns, so an app crash right after it keeps them.
  private func write(_ bytes: [UInt8]) throws {
    let written = bytes.withUnsafeBytes { Darwin.write(fd, $0.baseAddress, $0.count) }
    guard written == bytes.count else {
      // a short write leaves a partial record that the next replay drops.
      if written > 0 { ftruncate(fd, off_t(logBytes)) }
      throw oneNativeError("E_STORAGE_WRITE", "Storage: write failed (\(String(cString: strerror(errno))))")
    }
    logBytes += written
  }

  // replays the log once per process. a record cut short by a crash mid-write
  // is dropped and the file truncated to the last whole record.
  private func open() throws {
    if fd >= 0 { return }
    try? FileManager.default.createDirectory(
      at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    let data: Data
    do {
      data = FileManager.default.fileExists(atPath: url.path) ? try Data(contentsOf: url) : Data()
    } catch {
      throw oneNativeError("E_STORAGE_OPEN", "Storage: \(error.localizedDescription)")
    }
    entries = [:]
    liveBytes = 0
    let valid = replay(data)
    let opened = Darwin.open(url.path, O_WRONLY | O_CREAT | O_APPEND | O_CLOEXEC, 0o644)
    guard opened >= 0 else {
      throw oneNativeError("E_STORAGE_OPEN", "Storage: open failed (\(String(cString: strerror(errno))))")
    }
    if valid < data.count { ftruncate(opened, off_t(valid)) }
    fd = opened
    logBytes = valid
  }

  private func replay(_ data: Data) -> Int {
    return data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) -> Int in
      var offset = 0
      var valid = 0
      func field() -> String? {
        guard offset + 4 <= raw.count else { return nil }
        let length = Int(UInt32(littleEndian: raw.loadUnaligned(fromByteOffset: offset, as: UInt32.self)))
        offset += 4
        guard length <= raw.count - offset else { return nil }
        let text = String(decoding: UnsafeRawBufferPointer(rebasing: raw[offset..<offset + length]), as: UTF8.self)
        offset += length
        return text
      }
      while offset < raw.count {
        let op = raw[offset]
        offset += 1
        guard op == Self.setOp || op == Self.removeOp, let key = field() else { break }
        if op == Self.setOp {
          guard let value = field() else { break }
          if let previous = entries.updateValue(value, forKey: key) {
            liveBytes -= Self.setSize(key, previous)
          }
          liveBytes += Self.setSize(key, value)
        } else if let previous = entries.removeValue(forKey: key) {
          liveBytes -= Self.setSize(key, previous)
        }
        valid = offset
      }
      return valid
    }
  }

  // writes the live entries to a temporary file and renames it over the log,
  // so a crash during compaction leaves one whole log or the other.
  private func compactIfNeeded() throws {
    guard logBytes > Self.compactFloor, logBytes > liveBytes * 2 else { return }
    var snapshot: [UInt8] = []
    snapshot.reserveCapacity(liveBytes)
    for (key, value) in entries {
      Self.append(&snapshot, op: Self.setOp, key: key, value: value)
    }
    Darwin.close(fd)
    fd = -1
    let temporary = url.path + ".tmp"
    let staged = Darwin.open(temporary, O_WRONLY | O_CREAT | O_TRUNC | O_CLOEXEC, 0o644)
    let written = staged < 0 ? -1 : snapshot.withUnsafeBytes { Darwin.write(staged, $0.baseAddress, $0.count) }
    let synced = staged >= 0 && written == snapshot.count && fsync(staged) == 0
    if staged >= 0 { Darwin.close(staged) }
    guard synced, rename(temporary, url.path) == 0 else {
      let reason = String(cString: strerror(errno))
      unlink(temporary)
      throw oneNativeError("E_STORAGE_WRITE", "Storage: compaction failed (\(reason))")
    }
    try open()
  }
}
