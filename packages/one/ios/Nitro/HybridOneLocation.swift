import CoreLocation
import NitroModules
import UIKit

final class HybridOneLocation: HybridOneLocationSpec {
  private var manager: CLLocationManager?
  private let delegate = OneLocationDelegate()
  private var permissionPromises: [Promise<LocationPermissionStatus>] = []
  private var positionPromises: [Promise<LocationPosition>] = []
  private var positionListeners: [UUID: ((LocationPosition) -> Void, (String, String) -> Void)] = [:]
  private var monitoring = false
  private var geocoders: [UUID: CLGeocoder] = [:]

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
      if self.monitoring, let position = Self.recentPosition(manager) {
        promise.resolve(withResult: position)
        return
      }
      self.positionPromises.append(promise)
      if self.positionPromises.count == 1 && !self.monitoring {
        manager.requestLocation()
      }
    }
    return promise
  }

  func addPositionListener(
    onPosition: @escaping (LocationPosition) -> Void,
    onError: @escaping (String, String) -> Void
  ) throws -> () -> Void {
    let id = UUID()
    DispatchQueue.main.async {
      let manager = self.locationManager()
      let status = manager.authorizationStatus
      guard status == .authorizedWhenInUse || status == .authorizedAlways else {
        onError("E_LOCATION_PERMISSION", "Location.watchPosition: location permission is required")
        return
      }
      self.positionListeners[id] = (onPosition, onError)
      if let position = Self.recentPosition(manager) { onPosition(position) }
      if self.positionPromises.isEmpty && !self.monitoring {
        manager.startUpdatingLocation()
        self.monitoring = true
      }
    }
    return { [weak self] in
      DispatchQueue.main.async {
        guard let self else { return }
        self.positionListeners.removeValue(forKey: id)
        if self.positionListeners.isEmpty && self.monitoring {
          let manager = self.locationManager()
          manager.stopUpdatingLocation()
          self.monitoring = false
          if !self.positionPromises.isEmpty { manager.requestLocation() }
        }
      }
    }
  }

  func geocodeAddress(address: String) throws -> Promise<[LocationPlace]> {
    let promise = Promise<[LocationPlace]>()
    DispatchQueue.main.async {
      guard !address.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
        promise.reject(withError: oneNativeError("E_LOCATION_GEOCODE", "Location.geocodeAddress: address is required"))
        return
      }
      let id = UUID()
      let geocoder = CLGeocoder()
      self.geocoders[id] = geocoder
      geocoder.geocodeAddressString(address) { placemarks, error in
        DispatchQueue.main.async {
          self.finishGeocode(id, promise, placemarks, error)
        }
      }
    }
    return promise
  }

  func reverseGeocode(latitude: Double, longitude: Double) throws -> Promise<[LocationPlace]> {
    let promise = Promise<[LocationPlace]>()
    DispatchQueue.main.async {
      guard CLLocationCoordinate2DIsValid(CLLocationCoordinate2D(latitude: latitude, longitude: longitude)) else {
        promise.reject(withError: oneNativeError("E_LOCATION_GEOCODE", "Location.reverseGeocode: invalid coordinate"))
        return
      }
      let id = UUID()
      let geocoder = CLGeocoder()
      self.geocoders[id] = geocoder
      geocoder.reverseGeocodeLocation(CLLocation(latitude: latitude, longitude: longitude)) { placemarks, error in
        DispatchQueue.main.async {
          self.finishGeocode(id, promise, placemarks, error)
        }
      }
    }
    return promise
  }

  private func finishGeocode(
    _ id: UUID, _ promise: Promise<[LocationPlace]>, _ placemarks: [CLPlacemark]?, _ error: Error?
  ) {
    geocoders.removeValue(forKey: id)
    if let error {
      let nativeError = error as NSError
      if nativeError.domain == kCLErrorDomain && nativeError.code == CLError.geocodeFoundNoResult.rawValue {
        promise.resolve(withResult: [])
        return
      }
      promise.reject(withError: oneNativeError(
        "E_LOCATION_GEOCODE",
        "Location.geocode: \(nativeError.domain) \(nativeError.code): \(error.localizedDescription)"))
      return
    }
    promise.resolve(withResult: (placemarks ?? []).compactMap { place in
      guard let coordinate = place.location?.coordinate else { return nil }
      return LocationPlace(
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        name: place.name,
        street: place.thoroughfare,
        houseNumber: place.subThoroughfare,
        city: place.locality,
        region: place.administrativeArea,
        postalCode: place.postalCode,
        country: place.country,
        isoCountryCode: place.isoCountryCode)
    })
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
      if !positionListeners.isEmpty {
        if monitoring { manager.stopUpdatingLocation(); monitoring = false }
        let listeners = Array(positionListeners.values)
        positionListeners.removeAll()
        for (_, onError) in listeners {
          onError("E_LOCATION_PERMISSION", "Location.watchPosition: location permission was removed")
        }
      }
      let positions = positionPromises
      positionPromises.removeAll()
      for promise in positions {
        promise.reject(
          withError: oneNativeError(
            "E_LOCATION_PERMISSION", "Location.getCurrentPosition: location permission was removed"))
      }
    } else if !positionListeners.isEmpty && positionPromises.isEmpty && !monitoring {
      manager.startUpdatingLocation()
      monitoring = true
    }
  }

  fileprivate func didUpdateLocations(_ locations: [CLLocation]) {
    guard let location = locations.last else { return }
    let position = Self.position(location)
    let pending = positionPromises
    positionPromises.removeAll()
    for promise in pending {
      promise.resolve(withResult: position)
    }
    for (onPosition, _) in positionListeners.values { onPosition(position) }
    if !positionListeners.isEmpty && !monitoring {
      locationManager().startUpdatingLocation()
      monitoring = true
    }
  }

  fileprivate func didFailWithError(_ error: Error) {
    let nativeError = error as NSError
    let denied = nativeError.domain == kCLErrorDomain && nativeError.code == CLError.denied.rawValue
    let locationUnknown = nativeError.domain == kCLErrorDomain && nativeError.code == CLError.locationUnknown.rawValue
    if locationUnknown && monitoring { return }
    let pending = positionPromises
    positionPromises.removeAll()
    for promise in pending {
      promise.reject(
        withError: oneNativeError(
          denied ? "E_LOCATION_PERMISSION" : "E_LOCATION_UNAVAILABLE",
          "Location.getCurrentPosition: \(nativeError.domain) \(nativeError.code): \(error.localizedDescription)"))
    }
    if !positionListeners.isEmpty && !monitoring && !denied {
      locationManager().startUpdatingLocation()
      monitoring = true
    }
    if locationUnknown { return }
    if denied {
      let listeners = Array(positionListeners.values)
      positionListeners.removeAll()
      if monitoring { locationManager().stopUpdatingLocation(); monitoring = false }
      for (_, onError) in listeners {
        onError("E_LOCATION_PERMISSION", "Location.watchPosition: location permission was removed")
      }
      return
    }
    for (_, onError) in positionListeners.values {
      onError(
        denied ? "E_LOCATION_PERMISSION" : "E_LOCATION_UNAVAILABLE",
        "Location.watchPosition: \(nativeError.domain) \(nativeError.code): \(error.localizedDescription)")
    }
  }

  private static func recentPosition(_ manager: CLLocationManager) -> LocationPosition? {
    guard let location = manager.location,
      location.horizontalAccuracy >= 0,
      location.timestamp.timeIntervalSinceNow >= -30
    else { return nil }
    return position(location)
  }

  private static func position(_ location: CLLocation) -> LocationPosition {
    LocationPosition(
      latitude: location.coordinate.latitude,
      longitude: location.coordinate.longitude,
      accuracy: location.horizontalAccuracy,
      altitude: location.altitude,
      altitudeAccuracy: location.verticalAccuracy,
      course: location.course,
      speed: location.speed,
      timestamp: location.timestamp.timeIntervalSince1970 * 1000)
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
