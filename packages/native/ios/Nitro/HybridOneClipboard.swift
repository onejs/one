import NitroModules
import UIKit

// string-only clipboard, matching expo-clipboard's string api: get/set/has
// backed by the general pasteboard, read and written on the main actor.
final class HybridOneClipboard: HybridOneClipboardSpec {
  func getString() throws -> Promise<String> {
    return Promise.async { @MainActor in UIPasteboard.general.string ?? "" }
  }

  func setString(text: String) throws -> Promise<Bool> {
    return Promise.async { @MainActor in
      UIPasteboard.general.string = text
      return true
    }
  }

  func hasString() throws -> Promise<Bool> {
    return Promise.async { @MainActor in UIPasteboard.general.hasStrings }
  }
}
