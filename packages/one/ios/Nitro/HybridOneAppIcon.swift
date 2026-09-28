import Foundation
import NitroModules
import UIKit

final class HybridOneAppIcon: HybridOneAppIconSpec {
  private var changing = false

  func isSupported() throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    DispatchQueue.main.async {
      promise.resolve(withResult: UIApplication.shared.supportsAlternateIcons)
    }
    return promise
  }

  func getCurrentName() throws -> Promise<String?> {
    let promise = Promise<String?>()
    DispatchQueue.main.async {
      promise.resolve(withResult: UIApplication.shared.alternateIconName)
    }
    return promise
  }

  func setIcon(name: String?) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      let app = UIApplication.shared
      if let name {
        let icons = Bundle.main.object(forInfoDictionaryKey: "CFBundleIcons") as? [String: Any]
        let alternates = icons?["CFBundleAlternateIcons"] as? [String: Any]
        guard alternates?[name] != nil else {
          promise.reject(withError: oneNativeError("E_APP_ICON_INPUT", "AppIcon.setIcon: unknown alternate icon \(name)"))
          return
        }
      }
      guard app.supportsAlternateIcons else {
        promise.reject(withError: oneNativeError("E_APP_ICON_UNAVAILABLE", "AppIcon.setIcon: alternate icons are unavailable"))
        return
      }
      guard app.applicationState == .active else {
        promise.reject(withError: oneNativeError("E_APP_ICON_INACTIVE", "AppIcon.setIcon: app must be active"))
        return
      }
      guard !self.changing else {
        promise.reject(withError: oneNativeError("E_APP_ICON_BUSY", "AppIcon.setIcon: another icon change is in progress"))
        return
      }
      if app.alternateIconName == name {
        promise.resolve(withResult: ())
        return
      }
      self.changing = true
      app.setAlternateIconName(name) { error in
        DispatchQueue.main.async {
          self.changing = false
          if let error {
            promise.reject(withError: oneNativeError("E_APP_ICON_CHANGE", "AppIcon.setIcon: \(error.localizedDescription)"))
          } else {
            promise.resolve(withResult: ())
          }
        }
      }
    }
    return promise
  }
}
