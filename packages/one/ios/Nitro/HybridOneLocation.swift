import CoreLocation
import NitroModules
import UIKit

final class HybridOneLocation: HybridOneLocationSpec {
  private var manager: CLLocationManager?
  private let delegate = OneLocationDelegate()
  private var permissionPromises: [Promise<LocationPermissionStatus>] = []
  private var positionPromises: [Promise<LocationPosition>] = []
  private var positionListeners: [UUID: (
    onPosition: (LocationPosition) -> Void,
    onError: (String, String) -> Void,
    background: Bool
  )] = [:]
  private var monitoring = false
  private var geocoders: [UUID: CLGeocoder] = [:]
  private struct MonitoredRegion {
    var region: CLCircularRegion
    var notifyOnEntry: Bool
    var notifyOnExit: Bool
    var state: RegionState
  }
  private var monitoredRegions: [String: MonitoredRegion] = [:]
  private var didEnterListeners: [UUID: (LocationRegion) -> Void] = [:]
  private var didExitListeners: [UUID: (LocationRegion) -> Void] = [:]
  private var statePromises: [String: [Promise<RegionState>]] = [:]

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

  func requestAlwaysAuthorization() throws -> Promise<LocationPermissionStatus> {
    let promise = Promise<LocationPermissionStatus>()
    DispatchQueue.main.async {
      guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSLocationWhenInUseUsageDescription")
        as? String, !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      else {
        promise.reject(
          withError: oneNativeError(
            "E_LOCATION_MANIFEST", "Location.requestAlwaysAuthorization: set native.app.location.whenInUse"))
        return
      }
      guard let alwaysUsage = Bundle.main.object(forInfoDictionaryKey: "NSLocationAlwaysAndWhenInUseUsageDescription")
        as? String, !alwaysUsage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      else {
        promise.reject(
          withError: oneNativeError(
            "E_LOCATION_MANIFEST", "Location.requestAlwaysAuthorization: set native.app.location.alwaysAndWhenInUse"))
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
            "E_LOCATION_BACKGROUND", "Location.requestAlwaysAuthorization: app must be active"))
        return
      }
      self.permissionPromises.append(promise)
      manager.requestAlwaysAuthorization()
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
    onError: @escaping (String, String) -> Void,
    background: Bool
  ) throws -> () -> Void {
    let id = UUID()
    DispatchQueue.main.async {
      let manager = self.locationManager()
      let status = manager.authorizationStatus
      guard status == .authorizedWhenInUse || status == .authorizedAlways else {
        onError("E_LOCATION_PERMISSION", "Location.watchPosition: location permission is required")
        return
      }
      if background {
        guard (Bundle.main.object(forInfoDictionaryKey: "UIBackgroundModes") as? [String])?
          .contains("location") == true else {
          onError("E_LOCATION_MANIFEST", "Location.watchPosition: set native.app.location.background")
          return
        }
        guard UIApplication.shared.applicationState == .active else {
          onError("E_LOCATION_BACKGROUND", "Location.watchPosition: start the background watch while active")
          return
        }
      }
      self.positionListeners[id] = (onPosition, onError, background)
      self.updateBackgroundOptions(manager)
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
        let manager = self.locationManager()
        self.updateBackgroundOptions(manager)
        if self.positionListeners.isEmpty && self.monitoring {
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

  func startMonitoring(region: LocationRegion) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      let manager = self.locationManager()
      guard manager.authorizationStatus == .authorizedWhenInUse ||
        manager.authorizationStatus == .authorizedAlways
      else {
        promise.reject(
          withError: oneNativeError(
            "E_LOCATION_PERMISSION", "Location.startMonitoring: location permission is required"))
        return
      }
      guard CLLocationManager.isMonitoringAvailable(for: CLCircularRegion.self) else {
        promise.reject(
          withError: oneNativeError(
            "E_LOCATION_UNAVAILABLE", "Location.startMonitoring: region monitoring is unavailable"))
        return
      }
      let identifier = region.identifier.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !identifier.isEmpty else {
        promise.reject(
          withError: oneNativeError(
            "E_LOCATION_REGION", "Location.startMonitoring: region identifier is required"))
        return
      }
      guard CLLocationCoordinate2DIsValid(
        CLLocationCoordinate2D(
          latitude: region.center.latitude, longitude: region.center.longitude)) else {
        promise.reject(
          withError: oneNativeError(
            "E_LOCATION_REGION", "Location.startMonitoring: region has an invalid coordinate"))
        return
      }
      guard region.radius > 0 else {
        promise.reject(
          withError: oneNativeError(
            "E_LOCATION_REGION", "Location.startMonitoring: region radius must be greater than 0"))
        return
      }
      if self.monitoredRegions[identifier] == nil && self.monitoredRegions.count >= 20 {
        promise.reject(
          withError: oneNativeError(
            "E_LOCATION_GEOFENCING", "Location.startMonitoring: at most 20 regions can be monitored"))
        return
      }
      let circular = CLCircularRegion(
        center: CLLocationCoordinate2D(
          latitude: region.center.latitude, longitude: region.center.longitude),
        radius: region.radius,
        identifier: identifier)
      circular.notifyOnEntry = region.notifyOnEntry ?? true
      circular.notifyOnExit = region.notifyOnExit ?? true
      if let kept = self.monitoredRegions[identifier],
        kept.region.center.latitude == circular.center.latitude,
        kept.region.center.longitude == circular.center.longitude,
        kept.region.radius == circular.radius,
        kept.notifyOnEntry == circular.notifyOnEntry,
        kept.notifyOnExit == circular.notifyOnExit
      {
        promise.resolve(withResult: ())
        return
      }
      if let previous = self.monitoredRegions[identifier] {
        manager.stopMonitoring(for: previous.region)
      }
      self.monitoredRegions[identifier] = MonitoredRegion(
        region: circular,
        notifyOnEntry: circular.notifyOnEntry,
        notifyOnExit: circular.notifyOnExit,
        state: .unknown)
      manager.startMonitoring(for: circular)
      promise.resolve(withResult: ())
    }
    return promise
  }

  func stopMonitoring(identifier: String) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      if let monitored = self.monitoredRegions[identifier] {
        self.locationManager().stopMonitoring(for: monitored.region)
        self.monitoredRegions.removeValue(forKey: identifier)
      }
      promise.resolve(withResult: ())
    }
    return promise
  }

  func monitoredRegions() throws -> [LocationRegion] {
    if Thread.isMainThread {
      return monitoredSnapshot()
    }
    return DispatchQueue.main.sync { monitoredSnapshot() }
  }

  func requestState(identifier: String) throws -> Promise<RegionState> {
    let promise = Promise<RegionState>()
    DispatchQueue.main.async {
      guard let monitored = self.monitoredRegions[identifier] else {
        promise.reject(
          withError: oneNativeError(
            "E_LOCATION_REGION", "Location.requestState: no monitored region with that identifier"))
        return
      }
      var pending = self.statePromises[identifier] ?? []
      pending.append(promise)
      self.statePromises[identifier] = pending
      if pending.count == 1 {
        self.locationManager().requestState(for: monitored.region)
      }
    }
    return promise
  }

  func addDidEnterRegionListener(listener: @escaping (LocationRegion) -> Void) throws -> () -> Void {
    let id = UUID()
    DispatchQueue.main.async {
      self.didEnterListeners[id] = listener
    }
    return { [weak self] in
      DispatchQueue.main.async {
        self?.didEnterListeners.removeValue(forKey: id)
      }
    }
  }

  func addDidExitRegionListener(listener: @escaping (LocationRegion) -> Void) throws -> () -> Void {
    let id = UUID()
    DispatchQueue.main.async {
      self.didExitListeners[id] = listener
    }
    return { [weak self] in
      DispatchQueue.main.async {
        self?.didExitListeners.removeValue(forKey: id)
      }
    }
  }

  private func monitoredSnapshot() -> [LocationRegion] {
    monitoredRegions.values.sorted { $0.region.identifier < $1.region.identifier }.map {
      LocationRegion(
        identifier: $0.region.identifier,
        center: RegionCenter(
          latitude: $0.region.center.latitude, longitude: $0.region.center.longitude),
        radius: $0.region.radius,
        notifyOnEntry: $0.notifyOnEntry,
        notifyOnExit: $0.notifyOnExit,
        state: $0.state)
    }
  }

  private func snapshot(for identifier: String) -> LocationRegion? {
    guard let monitored = monitoredRegions[identifier] else { return nil }
    return LocationRegion(
      identifier: monitored.region.identifier,
      center: RegionCenter(
        latitude: monitored.region.center.latitude,
        longitude: monitored.region.center.longitude),
      radius: monitored.region.radius,
      notifyOnEntry: monitored.notifyOnEntry,
      notifyOnExit: monitored.notifyOnExit,
      state: monitored.state)
  }

  fileprivate func didEnterRegion(_ region: CLRegion) {
    guard var monitored = monitoredRegions[region.identifier] else { return }
    monitored.state = .inside
    monitoredRegions[region.identifier] = monitored
    guard monitored.notifyOnEntry, let snapshot = snapshot(for: region.identifier) else { return }
    for listener in didEnterListeners.values { listener(snapshot) }
  }

  fileprivate func didExitRegion(_ region: CLRegion) {
    guard var monitored = monitoredRegions[region.identifier] else { return }
    monitored.state = .outside
    monitoredRegions[region.identifier] = monitored
    guard monitored.notifyOnExit, let snapshot = snapshot(for: region.identifier) else { return }
    for listener in didExitListeners.values { listener(snapshot) }
  }

  fileprivate func didDetermineState(_ state: CLRegionState, for region: CLRegion) {
    let resolved: RegionState
    switch state {
    case .inside: resolved = .inside
    case .outside: resolved = .outside
    case .unknown: resolved = .unknown
    @unknown default: resolved = .unknown
    }
    if var monitored = monitoredRegions[region.identifier] {
      monitored.state = resolved
      monitoredRegions[region.identifier] = monitored
    }
    guard let pending = statePromises[region.identifier] else { return }
    statePromises.removeValue(forKey: region.identifier)
    for promise in pending {
      promise.resolve(withResult: resolved)
    }
  }

  fileprivate func monitoringDidFail(for region: CLRegion?) {
    guard let region else { return }
    if let monitored = monitoredRegions[region.identifier] {
      locationManager().stopMonitoring(for: monitored.region)
      monitoredRegions.removeValue(forKey: region.identifier)
    }
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
      if !monitoredRegions.isEmpty {
        for monitored in monitoredRegions.values {
          manager.stopMonitoring(for: monitored.region)
        }
        monitoredRegions.removeAll()
      }
      if !statePromises.isEmpty {
        let pending = statePromises
        statePromises.removeAll()
        for promises in pending.values {
          for promise in promises {
            promise.reject(
              withError: oneNativeError(
                "E_LOCATION_PERMISSION", "Location.requestState: location permission was removed"))
          }
        }
      }
      if !positionListeners.isEmpty {
        if monitoring { manager.stopUpdatingLocation(); monitoring = false }
        let listeners = Array(positionListeners.values)
        positionListeners.removeAll()
        updateBackgroundOptions(manager)
        for listener in listeners {
          listener.onError("E_LOCATION_PERMISSION", "Location.watchPosition: location permission was removed")
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
    for listener in positionListeners.values { listener.onPosition(position) }
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
      updateBackgroundOptions(locationManager())
      for listener in listeners {
        listener.onError("E_LOCATION_PERMISSION", "Location.watchPosition: location permission was removed")
      }
      return
    }
    for listener in positionListeners.values {
      listener.onError(
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

  private func updateBackgroundOptions(_ manager: CLLocationManager) {
    let enabled = positionListeners.values.contains { $0.background }
    manager.allowsBackgroundLocationUpdates = enabled
    manager.pausesLocationUpdatesAutomatically = !enabled
    manager.showsBackgroundLocationIndicator = enabled
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

  func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
    owner?.didEnterRegion(region)
  }

  func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
    owner?.didExitRegion(region)
  }

  func locationManager(
    _ manager: CLLocationManager, didDetermineState state: CLRegionState, for region: CLRegion
  ) {
    owner?.didDetermineState(state, for: region)
  }

  func locationManager(
    _ manager: CLLocationManager, monitoringDidFailFor region: CLRegion?, withError error: Error
  ) {
    owner?.monitoringDidFail(for: region)
  }
}
