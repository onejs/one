import Foundation
import NitroModules

// installed-binary identity for One.AppInfo: the user-visible version, the
// binary build, and the install identity, from the main bundle's info
// dictionary, which is thread-safe.
final class HybridOneAppInfo: HybridOneAppInfoSpec {
  private let info = Bundle.main.infoDictionary

  var version: String? { info?["CFBundleShortVersionString"] as? String }
  var build: String? { info?["CFBundleVersion"] as? String }
  var applicationId: String? { info?["CFBundleIdentifier"] as? String }
}
