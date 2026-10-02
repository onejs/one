#include "HybridOneCrypto.hpp"

#include <cmath>
#include <cstdint>
#include <stdexcept>
#include <stdlib.h>

namespace margelo::nitro::one {

void HybridOneCrypto::fillRandomBytes(const std::shared_ptr<ArrayBuffer>& buffer, double offset, double length) {
  double size = static_cast<double>(buffer->size());
  if (!(offset >= 0 && length >= 0 && offset == std::floor(offset) && length == std::floor(length) &&
        offset + length <= size)) {
    throw std::runtime_error("secure random: range outside the buffer");
  }
  arc4random_buf(buffer->data() + static_cast<size_t>(offset), static_cast<size_t>(length));
}

// rfc 4122 section 4.4: 16 random bytes with the version nibble set to 4 and
// the variant bits to 10.
std::string HybridOneCrypto::randomUUID() {
  uint8_t bytes[16];
  arc4random_buf(bytes, sizeof(bytes));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  static constexpr char hex[] = "0123456789abcdef";
  std::string uuid(36, '-');
  size_t at = 0;
  for (size_t index = 0; index < sizeof(bytes); index++) {
    if (index == 4 || index == 6 || index == 8 || index == 10) at++;
    uuid[at++] = hex[bytes[index] >> 4];
    uuid[at++] = hex[bytes[index] & 15];
  }
  return uuid;
}

} // namespace margelo::nitro::one
