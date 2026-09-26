import CoreLocation
import NitroModules
import UIKit

final class HybridOneLocation: HybridOneLocationSpec {
  private var manager: CLLocationManager?
  private let delegate = OneLocationDelegate()
  private var permissionPromises: [Promise<LocationPermissionStatus>] = []
  private var positionPromises: [Promise<LocationPosition>] = []

  override init() {
    super.init()
    delegate.owner = self
  }

  func getPermissionStatus() throws -> LocationPermissionStatus {
    if Thread.isMainThread {
      return Self.status(locationManager().authorizationStatus)
    }
    return DispatchQueue.main.sync { Self.status(locationManager().authorizationStatus) }
  }

  func requestWhenInUsePermission() throws -> Promise<LocationPermissionStatus> {
    let promise = Promise<LocationPermissionStatus>()
    DispatchQueue.main.async {
      guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSLocationWhenInUseUsageDescription")
        as? String, !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      else {
        promise.reject(
          withError: oneNativeError(
            "E_LOCATION_MANIFEST", "Location.requestWhenInUsePermission: set native.app.location.whenInUse"))
        return
      }
      let manager = self.locationManager()
      guard manager.authorizationStatus == .notDetermined else {
        promise.resolve(withResult: Self.status(manager.authorizationStatus))
        return
      }
      if !self.permissionPromises.isEmpty {
        self.permissionPromises.append(promise)
        return
      }
      guard UIApplication.shared.applicationState == .active else {
        promise.reject(
          withError: oneNativeError(
            "E_LOCATION_BACKGROUND", "Location.requestWhenInUsePermission: app must be active"))
        return
      }
      self.permissionPromises.append(promise)
      manager.requestWhenInUseAuthorization()
    }
    return promise
  }

  func getCurrentPosition() throws -> Promise<LocationPosition> {
    let promise = Promise<LocationPosition>()
    DispatchQueue.main.async {
      let manager = self.locationManager()
      guard manager.authorizationStatus == .authorizedWhenInUse ||
        manager.authorizationStatus == .authorizedAlways
      else {
        promise.reject(
          withError: oneNativeError(
            "E_LOCATION_PERMISSION", "Location.getCurrentPosition: location permission is required"))
        return
      }
      self.positionPromises.append(promise)
      if self.positionPromises.count == 1 {
        manager.requestLocation()
      }
    }
    return promise
  }

  fileprivate func didChangeAuthorization(_ manager: CLLocationManager) {
    let status = Self.status(manager.authorizationStatus)
    guard status != .notdetermined else { return }
    let pending = permissionPromises
    permissionPromises.removeAll()
    for promise in pending {
      promise.resolve(withResult: status)
    }
    if status != .wheninuse && status != .always {
      let positions = positionPromises
      positionPromises.removeAll()
      for promise in positions {
        promise.reject(
          withError: oneNativeError(
            "E_LOCATION_PERMISSION", "Location.getCurrentPosition: location permission was removed"))
      }
    }
  }

  fileprivate func didUpdateLocations(_ locations: [CLLocation]) {
    guard let location = locations.last else { return }
    let position = LocationPosition(
      latitude: location.coordinate.latitude,
      longitude: location.coordinate.longitude,
      accuracy: location.horizontalAccuracy,
      altitude: location.altitude,
      altitudeAccuracy: location.verticalAccuracy,
      course: location.course,
      speed: location.speed,
      timestamp: location.timestamp.timeIntervalSince1970 * 1000
    )
    let pending = positionPromises
    positionPromises.removeAll()
    for promise in pending {
      promise.resolve(withResult: position)
    }
  }

  fileprivate func didFailWithError(_ error: Error) {
    let nativeError = error as NSError
    let denied = nativeError.domain == kCLErrorDomain && nativeError.code == CLError.denied.rawValue
    let pending = positionPromises
    positionPromises.removeAll()
    for promise in pending {
      promise.reject(
        withError: oneNativeError(
          denied ? "E_LOCATION_PERMISSION" : "E_LOCATION_UNAVAILABLE",
          "Location.getCurrentPosition: \(nativeError.domain) \(nativeError.code): \(error.localizedDescription)"))
    }
  }

  private func locationManager() -> CLLocationManager {
    if let manager { return manager }
    let created = CLLocationManager()
    created.delegate = delegate
    manager = created
    return created
  }

  private static func status(_ status: CLAuthorizationStatus) -> LocationPermissionStatus {
    switch status {
    case .notDetermined: return .notdetermined
    case .restricted: return .restricted
    case .denied: return .denied
    case .authorizedWhenInUse: return .wheninuse
    case .authorizedAlways: return .always
    @unknown default: return .restricted
    }
  }
}

private final class OneLocationDelegate: NSObject, CLLocationManagerDelegate {
  weak var owner: HybridOneLocation?

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    owner?.didChangeAuthorization(manager)
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    owner?.didUpdateLocations(locations)
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    owner?.didFailWithError(error)
  }
}
