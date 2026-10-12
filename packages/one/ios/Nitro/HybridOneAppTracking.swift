import AppTrackingTransparency
import NitroModules
import UIKit

final class HybridOneAppTracking: HybridOneAppTrackingSpec {
  private var pending: [Promise<AppTrackingPermissionStatus>] = []

  func getPermissionStatus() throws -> AppTrackingPermissionStatus {
    Self.status(ATTrackingManager.trackingAuthorizationStatus)
  }

  func requestPermission() throws -> Promise<AppTrackingPermissionStatus> {
    let promise = Promise<AppTrackingPermissionStatus>()
    DispatchQueue.main.async {
      if !self.pending.isEmpty {
        self.pending.append(promise)
        return
      }
      guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSUserTrackingUsageDescription")
        as? String, !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
        promise.reject(withError: oneNativeError(
          "E_APP_TRACKING_MANIFEST",
          "AppTracking.requestPermission: set ios.infoPlist.NSUserTrackingUsageDescription"))
        return
      }
      let current = ATTrackingManager.trackingAuthorizationStatus
      if current != .notDetermined {
        promise.resolve(withResult: Self.status(current))
        return
      }
      guard UIApplication.shared.applicationState == .active else {
        promise.reject(withError: oneNativeError(
          "E_APP_TRACKING_INACTIVE",
          "AppTracking.requestPermission: request while the app is active"))
        return
      }
      self.pending.append(promise)
      ATTrackingManager.requestTrackingAuthorization { status in
        DispatchQueue.main.async {
          let result = Self.status(status)
          let waiting = self.pending
          self.pending.removeAll()
          for item in waiting { item.resolve(withResult: result) }
        }
      }
    }
    return promise
  }

  private static func status(
    _ value: ATTrackingManager.AuthorizationStatus
  ) -> AppTrackingPermissionStatus {
    switch value {
    case .notDetermined: return .notdetermined
    case .restricted: return .restricted
    case .denied: return .denied
    case .authorized: return .authorized
    @unknown default: return .restricted
    }
  }
}
