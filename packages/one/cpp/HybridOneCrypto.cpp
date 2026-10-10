#include "HybridOneCrypto.hpp"

#include <algorithm>
#include <cstring>
#include <vector>
#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#else
#include <CommonCrypto/CommonDigest.h>
#endif
#include <cmath>
#include <cstdint>
#include <stdexcept>
#include <stdlib.h>

namespace margelo::nitro::one {

namespace {
#ifdef __ANDROID__
class MessageDigest : public facebook::jni::JavaClass<MessageDigest> {
 public:
  static constexpr auto kJavaDescriptor = "Ljava/security/MessageDigest;";

  static facebook::jni::local_ref<MessageDigest> create(const std::string& algorithm) {
    static const auto method = javaClassStatic()->getStaticMethod<facebook::jni::local_ref<MessageDigest>(facebook::jni::alias_ref<facebook::jni::JString>)>("getInstance");
    return method(javaClassStatic(), facebook::jni::make_jstring(algorithm));
  }

  void update(facebook::jni::alias_ref<facebook::jni::JArrayByte> bytes, jint length) {
    static const auto method = javaClassStatic()->getMethod<void(facebook::jni::alias_ref<facebook::jni::JArrayByte>, jint, jint)>("update");
    method(self(), bytes, 0, length);
  }

  facebook::jni::local_ref<facebook::jni::JArrayByte> finish() {
    static const auto method = javaClassStatic()->getMethod<facebook::jni::local_ref<facebook::jni::JArrayByte>()>("digest");
    return method(self());
  }
};

std::shared_ptr<ArrayBuffer> hash(const std::string& algorithm, const std::vector<uint8_t>& input) {
  facebook::jni::ThreadScope scope;
  auto engine = MessageDigest::create(algorithm);
  // bound the java-side temporary while streaming the native snapshot.
  constexpr size_t chunkSize = 65536;
  auto bytes = facebook::jni::JArrayByte::newArray(std::min(input.size(), chunkSize));
  for (size_t at = 0; at < input.size();) {
    auto length = static_cast<jint>(std::min(input.size() - at, chunkSize));
    bytes->setRegion(0, length, reinterpret_cast<const jbyte*>(input.data() + at));
    engine->update(bytes, length);
    at += length;
  }
  auto digest = engine->finish();
  auto output = ArrayBuffer::allocate(digest->size());
  digest->getRegion(0, digest->size(), reinterpret_cast<jbyte*>(output->data()));
  return output;
}
#else
template <typename Context, auto Init, auto Update, auto Final>
std::shared_ptr<ArrayBuffer> hashApple(const std::vector<uint8_t>& input, size_t size) {
  Context context;
  auto output = ArrayBuffer::allocate(size);
  if (Init(&context) != 1) throw std::runtime_error("digest initialization failed");
  // CommonCrypto's update length is 32-bit; stream so no input is truncated.
  constexpr size_t chunkSize = 65536;
  for (size_t at = 0; at < input.size();) {
    auto length = static_cast<CC_LONG>(std::min(input.size() - at, chunkSize));
    if (Update(&context, input.data() + at, length) != 1) throw std::runtime_error("digest update failed");
    at += length;
  }
  if (Final(output->data(), &context) != 1) throw std::runtime_error("digest finalization failed");
  return output;
}

std::shared_ptr<ArrayBuffer> hash(const std::string& algorithm, const std::vector<uint8_t>& input) {
  if (algorithm == "SHA-1") return hashApple<CC_SHA1_CTX, CC_SHA1_Init, CC_SHA1_Update, CC_SHA1_Final>(input, CC_SHA1_DIGEST_LENGTH);
  if (algorithm == "SHA-256") return hashApple<CC_SHA256_CTX, CC_SHA256_Init, CC_SHA256_Update, CC_SHA256_Final>(input, CC_SHA256_DIGEST_LENGTH);
  if (algorithm == "SHA-384") return hashApple<CC_SHA512_CTX, CC_SHA384_Init, CC_SHA384_Update, CC_SHA384_Final>(input, CC_SHA384_DIGEST_LENGTH);
  if (algorithm == "SHA-512") return hashApple<CC_SHA512_CTX, CC_SHA512_Init, CC_SHA512_Update, CC_SHA512_Final>(input, CC_SHA512_DIGEST_LENGTH);
  throw std::runtime_error("unsupported digest algorithm");
}
#endif
} // namespace

std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> HybridOneCrypto::digest(
    const std::string& algorithm, const std::shared_ptr<ArrayBuffer>& buffer, double offset, double length) {
  if (algorithm != "SHA-1" && algorithm != "SHA-256" && algorithm != "SHA-384" && algorithm != "SHA-512") {
    throw std::runtime_error("unsupported digest algorithm");
  }
  if (!(offset >= 0 && length >= 0 && offset == std::floor(offset) && length == std::floor(length) &&
        offset + length <= static_cast<double>(buffer->size()))) {
    throw std::runtime_error("digest: range outside the buffer");
  }
  // copy only the requested range on the calling js thread. a borrowed jsi
  // buffer must never be accessed on a worker, or after the caller mutates it.
  std::vector<uint8_t> input(static_cast<size_t>(length));
  if (!input.empty()) std::memcpy(input.data(), buffer->data() + static_cast<size_t>(offset), input.size());
  return Promise<std::shared_ptr<ArrayBuffer>>::async([algorithm, input = std::move(input)]() {
    return hash(algorithm, input);
  });
}

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
