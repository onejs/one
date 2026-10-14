#include "HybridOneCrypto.hpp"

#include <algorithm>
#include <array>
#include <optional>
#include <cstring>
#include <vector>
#ifdef __ANDROID__
#include <fbjni/fbjni.h>
#else
#include <CommonCrypto/CommonCryptor.h>
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

// jni resolves methods by exact descriptor, so Cipher.init's parameters are
// declared as the api's own types, Key and AlgorithmParameterSpec, and the
// concrete specs derive from them so they pass without a cast.
class Key : public facebook::jni::JavaClass<Key> {
 public:
  static constexpr auto kJavaDescriptor = "Ljava/security/Key;";
};

class AlgorithmParameterSpec : public facebook::jni::JavaClass<AlgorithmParameterSpec> {
 public:
  static constexpr auto kJavaDescriptor = "Ljava/security/spec/AlgorithmParameterSpec;";
};

class SecretKeySpec : public facebook::jni::JavaClass<SecretKeySpec, Key> {
 public:
  static constexpr auto kJavaDescriptor = "Ljavax/crypto/spec/SecretKeySpec;";

  static facebook::jni::local_ref<SecretKeySpec> create(facebook::jni::alias_ref<facebook::jni::JArrayByte> key) {
    return newInstance(key, facebook::jni::make_jstring("AES"));
  }
};

class GCMParameterSpec : public facebook::jni::JavaClass<GCMParameterSpec, AlgorithmParameterSpec> {
 public:
  static constexpr auto kJavaDescriptor = "Ljavax/crypto/spec/GCMParameterSpec;";

  static facebook::jni::local_ref<GCMParameterSpec> create(jint tagBits, facebook::jni::alias_ref<facebook::jni::JArrayByte> iv) {
    return newInstance(tagBits, iv);
  }
};

class Cipher : public facebook::jni::JavaClass<Cipher> {
 public:
  static constexpr auto kJavaDescriptor = "Ljavax/crypto/Cipher;";
  static constexpr jint ENCRYPT_MODE = 1;
  static constexpr jint DECRYPT_MODE = 2;

  static facebook::jni::local_ref<Cipher> create() {
    static const auto method = javaClassStatic()->getStaticMethod<facebook::jni::local_ref<Cipher>(facebook::jni::alias_ref<facebook::jni::JString>)>("getInstance");
    return method(javaClassStatic(), facebook::jni::make_jstring("AES/GCM/NoPadding"));
  }

  void init(jint mode, facebook::jni::alias_ref<SecretKeySpec> key, facebook::jni::alias_ref<GCMParameterSpec> spec) {
    static const auto method = javaClassStatic()->getMethod<void(jint, facebook::jni::alias_ref<Key>, facebook::jni::alias_ref<AlgorithmParameterSpec>)>("init");
    method(self(), mode, key, spec);
  }

  void updateAAD(facebook::jni::alias_ref<facebook::jni::JArrayByte> aad) {
    static const auto method = javaClassStatic()->getMethod<void(facebook::jni::alias_ref<facebook::jni::JArrayByte>)>("updateAAD");
    method(self(), aad);
  }

  facebook::jni::local_ref<facebook::jni::JArrayByte> doFinal(facebook::jni::alias_ref<facebook::jni::JArrayByte> input) {
    static const auto method = javaClassStatic()->getMethod<facebook::jni::local_ref<facebook::jni::JArrayByte>(facebook::jni::alias_ref<facebook::jni::JArrayByte>)>("doFinal");
    return method(self(), input);
  }
};

facebook::jni::local_ref<facebook::jni::JArrayByte> toJavaBytes(const std::vector<uint8_t>& bytes) {
  auto out = facebook::jni::JArrayByte::newArray(bytes.size());
  if (!bytes.empty()) out->setRegion(0, static_cast<jint>(bytes.size()), reinterpret_cast<const jbyte*>(bytes.data()));
  return out;
}

std::shared_ptr<ArrayBuffer> fromJavaBytes(facebook::jni::alias_ref<facebook::jni::JArrayByte> bytes) {
  auto out = ArrayBuffer::allocate(bytes->size());
  if (bytes->size() > 0) bytes->getRegion(0, bytes->size(), reinterpret_cast<jbyte*>(out->data()));
  return out;
}

// javax.crypto does the whole AEAD: seal appends the tag, open verifies it
// and throws AEADBadTagException, which surfaces here as a jni exception.
std::shared_ptr<ArrayBuffer> aesGcm(bool encrypt, const std::vector<uint8_t>& key, const std::vector<uint8_t>& iv,
                                    const std::vector<uint8_t>& input, const std::optional<std::vector<uint8_t>>& aad,
                                    size_t tagLength) {
  facebook::jni::ThreadScope scope;
  auto cipher = Cipher::create();
  auto spec = GCMParameterSpec::create(static_cast<jint>(tagLength * 8), toJavaBytes(iv));
  cipher->init(encrypt ? Cipher::ENCRYPT_MODE : Cipher::DECRYPT_MODE, SecretKeySpec::create(toJavaBytes(key)), spec);
  if (aad && !aad->empty()) cipher->updateAAD(toJavaBytes(*aad));
  try {
    return fromJavaBytes(cipher->doFinal(toJavaBytes(input)));
  } catch (const std::exception&) {
    if (!encrypt) throw std::runtime_error("aesDecrypt: authentication failed");
    throw;
  }
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
  if (algorithm == "MD5") return hashApple<CC_MD5_CTX, CC_MD5_Init, CC_MD5_Update, CC_MD5_Final>(input, CC_MD5_DIGEST_LENGTH);
  if (algorithm == "SHA-1") return hashApple<CC_SHA1_CTX, CC_SHA1_Init, CC_SHA1_Update, CC_SHA1_Final>(input, CC_SHA1_DIGEST_LENGTH);
  if (algorithm == "SHA-256") return hashApple<CC_SHA256_CTX, CC_SHA256_Init, CC_SHA256_Update, CC_SHA256_Final>(input, CC_SHA256_DIGEST_LENGTH);
  if (algorithm == "SHA-384") return hashApple<CC_SHA512_CTX, CC_SHA384_Init, CC_SHA384_Update, CC_SHA384_Final>(input, CC_SHA384_DIGEST_LENGTH);
  if (algorithm == "SHA-512") return hashApple<CC_SHA512_CTX, CC_SHA512_Init, CC_SHA512_Update, CC_SHA512_Final>(input, CC_SHA512_DIGEST_LENGTH);
  throw std::runtime_error("unsupported digest algorithm");
}

// AES-GCM over CommonCrypto's public AES block primitive: the public headers
// have no GCM helper, so CTR and GHASH are composed here per NIST SP
// 800-38D. counter blocks are encrypted in one ECB pass (ECB over distinct
// counters is exactly GCM's CTR keystream), and the tag is always 16 bytes,
// as in expo-crypto on apple platforms.
using Block = std::array<uint8_t, 16>;

void aesEcb(const std::vector<uint8_t>& key, const uint8_t* input, size_t length, uint8_t* output) {
  CCCryptorRef cryptor = nullptr;
  auto status = CCCryptorCreateWithMode(kCCEncrypt, kCCModeECB, kCCAlgorithmAES, ccNoPadding, nullptr, key.data(),
                                        key.size(), nullptr, 0, 0, 0, &cryptor);
  if (status != kCCSuccess || cryptor == nullptr) throw std::runtime_error("aes: cipher creation failed");
  size_t moved = 0;
  status = CCCryptorUpdate(cryptor, input, length, output, length, &moved);
  CCCryptorRelease(cryptor);
  if (status != kCCSuccess || moved != length) throw std::runtime_error("aes: block encryption failed");
}

Block aesBlock(const std::vector<uint8_t>& key, const Block& input) {
  Block output{};
  aesEcb(key, input.data(), input.size(), output.data());
  return output;
}

uint64_t load64(const uint8_t* at) {
  uint64_t value = 0;
  for (int i = 0; i < 8; i++) value = (value << 8) | at[i];
  return value;
}

void store64(uint8_t* at, uint64_t value) {
  for (int i = 7; i >= 0; i--) {
    at[i] = static_cast<uint8_t>(value);
    value >>= 8;
  }
}

// GF(2^128) multiplication, NIST SP 800-38D algorithm 1, with the reduction
// constant R = 11100001 || 0^120. both operands carry bits of the hash key,
// so every step selects with masks instead of branching: the running time
// never depends on the key.
Block gfMultiply(const Block& x, const Block& y) {
  uint64_t zh = 0, zl = 0;
  uint64_t vh = load64(y.data()), vl = load64(y.data() + 8);
  for (int i = 0; i < 16; i++) {
    for (int bit = 7; bit >= 0; bit--) {
      const uint64_t take = 0 - static_cast<uint64_t>((x[i] >> bit) & 1);
      zh ^= vh & take;
      zl ^= vl & take;
      const uint64_t carry = 0 - (vl & 1);
      vl = (vl >> 1) | (vh << 63);
      vh = (vh >> 1) ^ (0xe100000000000000ULL & carry);
    }
  }
  Block out{};
  store64(out.data(), zh);
  store64(out.data() + 8, zl);
  return out;
}

Block ghash(const Block& h, const uint8_t* data, size_t length, Block state) {
  for (size_t at = 0; at < length; at += 16) {
    Block block{};
    std::memcpy(block.data(), data + at, std::min<size_t>(16, length - at));
    for (int i = 0; i < 16; i++) state[i] ^= block[i];
    state = gfMultiply(state, h);
  }
  return state;
}

Block ghashAll(const Block& h, const std::optional<std::vector<uint8_t>>& aad, const std::vector<uint8_t>& ciphertext) {
  Block state{};
  if (aad && !aad->empty()) state = ghash(h, aad->data(), aad->size(), state);
  if (!ciphertext.empty()) state = ghash(h, ciphertext.data(), ciphertext.size(), state);
  Block lengths{};
  store64(lengths.data(), static_cast<uint64_t>(aad ? aad->size() : 0) * 8);
  store64(lengths.data() + 8, static_cast<uint64_t>(ciphertext.size()) * 8);
  for (int i = 0; i < 16; i++) state[i] ^= lengths[i];
  return gfMultiply(state, h);
}

Block initialCounter(const Block& h, const std::vector<uint8_t>& iv) {
  if (iv.size() == 12) {
    Block j0{};
    std::memcpy(j0.data(), iv.data(), 12);
    j0[15] = 1;
    return j0;
  }
  Block state = ghash(h, iv.data(), iv.size(), Block{});
  Block lengths{};
  store64(lengths.data() + 8, static_cast<uint64_t>(iv.size()) * 8);
  for (int i = 0; i < 16; i++) state[i] ^= lengths[i];
  return gfMultiply(state, h);
}

void increment32(Block& counter) {
  uint32_t low = (static_cast<uint32_t>(counter[12]) << 24) | (static_cast<uint32_t>(counter[13]) << 16) |
                 (static_cast<uint32_t>(counter[14]) << 8) | counter[15];
  low += 1;
  counter[12] = static_cast<uint8_t>(low >> 24);
  counter[13] = static_cast<uint8_t>(low >> 16);
  counter[14] = static_cast<uint8_t>(low >> 8);
  counter[15] = static_cast<uint8_t>(low);
}

std::vector<uint8_t> gctr(const std::vector<uint8_t>& key, Block j0, const std::vector<uint8_t>& input) {
  std::vector<uint8_t> output(input.size());
  if (input.empty()) return output;
  const size_t blocks = (input.size() + 15) / 16;
  std::vector<uint8_t> counters(blocks * 16);
  Block counter = j0;
  for (size_t i = 0; i < blocks; i++) {
    increment32(counter);
    std::memcpy(counters.data() + i * 16, counter.data(), 16);
  }
  std::vector<uint8_t> keystream(counters.size());
  aesEcb(key, counters.data(), counters.size(), keystream.data());
  for (size_t i = 0; i < input.size(); i++) output[i] = input[i] ^ keystream[i];
  return output;
}

Block computeTag(const std::vector<uint8_t>& key, const Block& h, const Block& j0,
                 const std::optional<std::vector<uint8_t>>& aad, const std::vector<uint8_t>& ciphertext) {
  Block s = ghashAll(h, aad, ciphertext);
  Block mask = aesBlock(key, j0);
  for (int i = 0; i < 16; i++) s[i] ^= mask[i];
  return s;
}

std::shared_ptr<ArrayBuffer> aesGcmOpen(const std::vector<uint8_t>& key, const std::vector<uint8_t>& iv,
                                        const std::vector<uint8_t>& input, const std::optional<std::vector<uint8_t>>& aad,
                                        size_t tagLength);

std::shared_ptr<ArrayBuffer> aesGcm(bool encrypt, const std::vector<uint8_t>& key, const std::vector<uint8_t>& iv,
                                    const std::vector<uint8_t>& input, const std::optional<std::vector<uint8_t>>& aad,
                                    size_t tagLength) {
  if (!encrypt) return aesGcmOpen(key, iv, input, aad, tagLength);
  const Block h = aesBlock(key, Block{});
  const Block j0 = initialCounter(h, iv);
  if (encrypt) {
    auto ciphertext = gctr(key, j0, input);
    Block tag = computeTag(key, h, j0, aad, ciphertext);
    auto out = ArrayBuffer::allocate(ciphertext.size() + 16);
    if (!ciphertext.empty()) std::memcpy(out->data(), ciphertext.data(), ciphertext.size());
    std::memcpy(out->data() + ciphertext.size(), tag.data(), 16);
    return out;
  }
  throw std::runtime_error("aes: unreachable");
}

std::shared_ptr<ArrayBuffer> aesGcmOpen(const std::vector<uint8_t>& key, const std::vector<uint8_t>& iv,
                                        const std::vector<uint8_t>& input, const std::optional<std::vector<uint8_t>>& aad,
                                        size_t tagLength) {
  if (input.size() < tagLength) throw std::runtime_error("aesDecrypt: authentication failed");
  const Block h = aesBlock(key, Block{});
  const Block j0 = initialCounter(h, iv);
  std::vector<uint8_t> ciphertext(input.begin(), input.end() - static_cast<ptrdiff_t>(tagLength));
  Block expected = computeTag(key, h, j0, aad, ciphertext);
  uint8_t diff = 0;
  for (size_t i = 0; i < tagLength; i++) diff |= expected[i] ^ input[ciphertext.size() + i];
  if (diff != 0) throw std::runtime_error("aesDecrypt: authentication failed");
  auto plain = gctr(key, j0, ciphertext);
  auto out = ArrayBuffer::allocate(plain.size());
  if (!plain.empty()) std::memcpy(out->data(), plain.data(), plain.size());
  return out;
}
#endif
} // namespace

std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> HybridOneCrypto::digest(
    const std::string& algorithm, const std::shared_ptr<ArrayBuffer>& buffer, double offset, double length) {
  if (algorithm != "MD5" && algorithm != "SHA-1" && algorithm != "SHA-256" && algorithm != "SHA-384" && algorithm != "SHA-512") {
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


namespace {
std::vector<uint8_t> snapshot(const std::shared_ptr<ArrayBuffer>& buffer) {
  std::vector<uint8_t> out(buffer->size());
  if (!out.empty()) std::memcpy(out.data(), buffer->data(), out.size());
  return out;
}

std::optional<std::vector<uint8_t>> snapshot(const std::optional<std::shared_ptr<ArrayBuffer>>& buffer) {
  if (!buffer) return std::nullopt;
  return snapshot(*buffer);
}

void assertKeyAndIv(const std::vector<uint8_t>& key, const std::vector<uint8_t>& iv, const char* verb) {
  if (key.size() != 16 && key.size() != 24 && key.size() != 32) {
    throw std::runtime_error(std::string(verb) + ": key must be 128, 192, or 256 bits");
  }
  if (iv.empty()) throw std::runtime_error(std::string(verb) + ": iv must not be empty");
}

// gcm's allowed tag lengths in bytes. decrypt checks them too: a zero tag
// would compare nothing and accept any ciphertext, and one over 16 would read
// past the computed tag.
void assertTagLength(double tagLength, const char* verb) {
  for (double allowed : {16.0, 15.0, 14.0, 13.0, 12.0, 8.0, 4.0}) {
    if (tagLength == allowed) return;
  }
  throw std::runtime_error(std::string(verb) + ": unsupported tag length");
}
} // namespace

std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> HybridOneCrypto::aesEncrypt(
    const std::shared_ptr<ArrayBuffer>& key, const std::shared_ptr<ArrayBuffer>& iv,
    const std::shared_ptr<ArrayBuffer>& plaintext, const std::optional<std::shared_ptr<ArrayBuffer>>& additionalData,
    double tagLength) {
  // snapshot every input on the calling js thread, like digest: a borrowed
  // jsi buffer must never be read on a worker or after the caller mutates it.
  auto keyCopy = snapshot(key);
  auto ivCopy = snapshot(iv);
  auto plainCopy = snapshot(plaintext);
  auto aadCopy = snapshot(additionalData);
  assertKeyAndIv(keyCopy, ivCopy, "aesEncrypt");
  assertTagLength(tagLength, "aesEncrypt");
  return Promise<std::shared_ptr<ArrayBuffer>>::async(
      [keyCopy = std::move(keyCopy), ivCopy = std::move(ivCopy), plainCopy = std::move(plainCopy),
       aadCopy = std::move(aadCopy), tagLength]() {
        return aesGcm(true, keyCopy, ivCopy, plainCopy, aadCopy, static_cast<size_t>(tagLength));
      });
}

std::shared_ptr<Promise<std::shared_ptr<ArrayBuffer>>> HybridOneCrypto::aesDecrypt(
    const std::shared_ptr<ArrayBuffer>& key, const std::shared_ptr<ArrayBuffer>& iv,
    const std::shared_ptr<ArrayBuffer>& ciphertext, const std::optional<std::shared_ptr<ArrayBuffer>>& additionalData,
    double tagLength) {
  auto keyCopy = snapshot(key);
  auto ivCopy = snapshot(iv);
  auto cipherCopy = snapshot(ciphertext);
  auto aadCopy = snapshot(additionalData);
  assertKeyAndIv(keyCopy, ivCopy, "aesDecrypt");
  assertTagLength(tagLength, "aesDecrypt");
  return Promise<std::shared_ptr<ArrayBuffer>>::async(
      [keyCopy = std::move(keyCopy), ivCopy = std::move(ivCopy), cipherCopy = std::move(cipherCopy),
       aadCopy = std::move(aadCopy), tagLength]() {
        return aesGcm(false, keyCopy, ivCopy, cipherCopy, aadCopy, static_cast<size_t>(tagLength));
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
