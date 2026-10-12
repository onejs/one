#pragma once

#include "HybridOneStorageSpec.hpp"

namespace margelo::nitro::one {

// app key-value storage, one c++ engine for both platforms. entries live in a
// process-wide map, so a read never leaves memory, and each write appends one
// record to a memory-mapped log. the mapped pages belong to the kernel, so a
// write survives an app crash once the call returns, with no syscall on the
// write path. every hybrid instance shares the one store, since two in-memory
// copies over the same log would lose writes.
class HybridOneStorage : public HybridOneStorageSpec {
 public:
  HybridOneStorage() : HybridObject(TAG) {}

  std::optional<std::string> getItem(const std::string& key) override;
  void setItem(const std::string& key, const std::string& value) override;
  void removeItem(const std::string& key) override;
  std::vector<std::string> getAllKeys() override;
};

} // namespace margelo::nitro::one
