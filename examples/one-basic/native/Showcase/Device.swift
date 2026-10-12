import CryptoKit
import UIKit

// each method is an async function in typescript: `await Device.sha256('hi')`.
// one generates Device.d.swift.ts from these signatures.
@MainActor final class Device: PeachModule {
  init() {}

  func info() -> [String: String] {
    let device = UIDevice.current
    return [
      "language": "Swift",
      "model": device.model,
      "system": "\(device.systemName) \(device.systemVersion)",
    ]
  }

  func sha256(_ text: String) -> String {
    SHA256.hash(data: Data(text.utf8)).map { String(format: "%02x", $0) }.joined()
  }
}
