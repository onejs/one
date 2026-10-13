// macOS runtime harness for the apple AES-GCM and digest branches: includes
// the production translation unit so the anonymous-namespace helpers run as
// shipped, against NIST SP 800-38D vectors (cross-checked with OpenSSL).
// build from the repo root after `bun install` (headers are symlinked flat
// the same way build.py does it), then run the binary:
//
//   mkdir -p /tmp/one-crypto-harness/include/NitroModules
//   for h in $(find node_modules/react-native-nitro-modules/cpp node_modules/react-native-nitro-modules/ios -name '*.hpp'); do
//     ln -sf $(pwd)/$h /tmp/one-crypto-harness/include/NitroModules/$(basename $h); done
//   clang++ -std=c++20 -ffunction-sections -fdata-sections \
//     -I/tmp/one-crypto-harness/include -I/tmp/one-crypto-harness/include/NitroModules \
//     -Inode_modules/react-native/ReactCommon/jsi -Ipackages/one/cpp \
//     -Ipackages/one/nitrogen/generated/shared/c++ \
//     packages/one/tests/native-crypto/aes-harness.cpp \
//     node_modules/react-native/ReactCommon/jsi/jsi/jsi.cpp \
//     node_modules/react-native-nitro-modules/cpp/core/ArrayBuffer.cpp \
//     -Wl,-dead_strip -framework Security -o /tmp/one-crypto-harness/harness
//   /tmp/one-crypto-harness/harness   # prints ALL PASS
#include "HybridOneCrypto.cpp"
#include <cstdio>
#include <string>

using namespace margelo::nitro::one;
namespace margelo::nitro::one {
static auto digestHash = [](const std::string& algorithm, const std::vector<uint8_t>& input) {
  return hash(algorithm, input);
};
}

static std::vector<uint8_t> unhex(const char* text) {
  std::vector<uint8_t> out;
  for (size_t i = 0; text[i] && text[i + 1]; i += 2) {
    auto nibble = [](char c) { return c <= '9' ? c - '0' : (c <= 'F' ? c - 'A' + 10 : c - 'a' + 10); };
    out.push_back(static_cast<uint8_t>((nibble(text[i]) << 4) | nibble(text[i + 1])));
  }
  return out;
}

static std::string hexOf(const uint8_t* data, size_t size) {
  static const char* digits = "0123456789abcdef";
  std::string out;
  for (size_t i = 0; i < size; i++) {
    out += digits[data[i] >> 4];
    out += digits[data[i] & 15];
  }
  return out;
}

static int failures = 0;
static void check(bool ok, const char* label) {
  std::printf("%s %s\n", ok ? "PASS" : "FAIL", label);
  if (!ok) failures++;
}

int main() {
  // NIST SP 800-38D test case 2 (128-bit key, empty plaintext)
  {
    auto out = aesGcm(true, std::vector<uint8_t>(16, 0), std::vector<uint8_t>(12, 0), {}, std::nullopt, 16);
    check(hexOf(out->data(), out->size()) == "58e2fccefa7e3061367f1d57a4e7455a", "nist case 2 tag");
  }
  // NIST test case 3 (one zero block)
  {
    auto out = aesGcm(true, std::vector<uint8_t>(16, 0), std::vector<uint8_t>(12, 0), std::vector<uint8_t>(16, 0), std::nullopt, 16);
    check(hexOf(out->data(), out->size()) ==
              "0388dace60b6a392f328c2b971b2fe78ab6e47d42cec13bdf53a67b21257bddf",
          "nist case 3 seal");
  }
  // NIST test case 4 (partial block + aad)
  {
    auto key = unhex("feffe9928665731c6d6a8f9467308308");
    auto iv = unhex("cafebabefacedbaddecaf888");
    auto plain = unhex(
        "d9313225f88406e5a55909c5aff5269a86a7a9531534f7da2e4c303d8a318a721c3c0c95956809532fcf0e2449a6b525b16aedf5aa0de657ba637b39");
    auto aad = unhex("feedfacedeadbeeffeedfacedeadbeefabaddad2");
    auto out = aesGcm(true, key, iv, plain, aad, 16);
    check(hexOf(out->data(), out->size()) ==
              "42831ec2217774244b7221b784d0d49ce3aa212f2c02a4e035c17e2329aca12e21d514b25466931c7d8f6a5aac84aa051ba30b396a0aac973d58e0915bc94fbc3221a5db94fae95ae7121a47",
          "nist case 4-ish seal");
    // round trip and tamper rejection through the real entry points
    std::vector<uint8_t> sealed(out->data(), out->data() + out->size());
    auto opened = aesGcm(false, key, iv, sealed, aad, 16);
    check(std::vector<uint8_t>(opened->data(), opened->data() + opened->size()) == plain, "round trip");
    sealed[0] ^= 1;
    bool threw = false;
    try {
      aesGcm(false, key, iv, sealed, aad, 16);
    } catch (const std::exception&) {
      threw = true;
    }
    check(threw, "tampered ciphertext rejected");
  }
  // non-12-byte iv round trip (GHASH-derived J0)
  {
    auto key = unhex("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
    std::vector<uint8_t> iv = {1, 2, 3, 4, 5, 6, 7, 8};
    std::vector<uint8_t> plain = {'h', 'e', 'l', 'l', 'o'};
    auto out = aesGcm(true, key, iv, plain, std::nullopt, 16);
    std::vector<uint8_t> sealed(out->data(), out->data() + out->size());
    auto opened = aesGcm(false, key, iv, sealed, std::nullopt, 16);
    check(std::vector<uint8_t>(opened->data(), opened->data() + opened->size()) == plain, "8-byte iv round trip");
  }
  // MD5("abc") and SHA-256("abc") through the real hash()
  {
    auto md5 = digestHash("MD5", {'a', 'b', 'c'});
    check(hexOf(md5->data(), md5->size()) == "900150983cd24fb0d6963f7d28e17f72", "md5 abc");
    auto sha = digestHash("SHA-256", {'a', 'b', 'c'});
    check(hexOf(sha->data(), sha->size()) == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
          "sha256 abc");
  }
  std::printf(failures == 0 ? "ALL PASS\n" : "%d FAILURES\n", failures);
  return failures == 0 ? 0 : 1;
}
