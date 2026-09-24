import NitroModules
import Security

// secure random bytes for the crypto polyfill, straight from
// SecRandomCopyBytes into the returned buffer. a failed generator throws so
// the js side never falls back to Math.random.
final class HybridOneCrypto: HybridOneCryptoSpec {
  func getRandomBytes(count: Double) throws -> ArrayBuffer {
    guard count >= 0, count <= 65536, count == count.rounded() else {
      throw RuntimeError.error(withMessage: "secure random: invalid byte count \(count)")
    }
    let length = Int(count)
    let buffer = ArrayBuffer.allocate(size: length)
    guard length == 0 || SecRandomCopyBytes(kSecRandomDefault, length, buffer.data) == errSecSuccess
    else {
      throw RuntimeError.error(withMessage: "secure random: SecRandomCopyBytes failed")
    }
    return buffer
  }
}
