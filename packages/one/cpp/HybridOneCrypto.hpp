#pragma once

#include "HybridOneCryptoSpec.hpp"

namespace margelo::nitro::one {

// secure random for the crypto polyfill, one c++ implementation for both
// platforms over arc4random_buf, which is the system csprng on iOS and on
// Android's bionic and cannot fail. bytes go straight into the caller's
// buffer, and a uuid is formatted here so randomUUID is one call.
class HybridOneCrypto : public HybridOneCryptoSpec {
 public:
  HybridOneCrypto() : HybridObject(TAG) {}

  void fillRandomBytes(const std::shared_ptr<ArrayBuffer>& buffer, double offset, double length) override;
  std::string randomUUID() override;
};

} // namespace margelo::nitro::one
