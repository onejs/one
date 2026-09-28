import CoreLocation
import MapKit
import NitroModules

final class HybridOneMapServices: HybridOneMapServicesSpec {
  func search(query: String, center: MapCoordinate, radiusMeters: Double) throws -> Promise<[MapPlace]> {
    let promise = Promise<[MapPlace]>()
    guard Self.valid(center), radiusMeters.isFinite, radiusMeters >= 100,
      radiusMeters <= 50_000, !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      promise.reject(withError: Self.error("E_MAP_INPUT", "MapServices.search: invalid query, center, or radius"))
      return promise
    }
    DispatchQueue.main.async {
      let request = MKLocalSearch.Request()
      request.naturalLanguageQuery = query
      request.region = MKCoordinateRegion(
        center: Self.coordinate(center), latitudinalMeters: radiusMeters * 2,
        longitudinalMeters: radiusMeters * 2)
      MKLocalSearch(request: request).start { response, error in
        if let error {
          let failure = error as NSError
          if failure.domain == MKErrorDomain &&
            failure.code == MKError.Code.placemarkNotFound.rawValue {
            promise.resolve(withResult: [])
            return
          }
          promise.reject(withError: Self.error("E_MAP_SEARCH",
            "MapServices.search: \(error.localizedDescription) (\(failure.domain) \(failure.code))"))
          return
        }
        promise.resolve(withResult: response?.mapItems.map { item in
          MapPlace(name: item.name ?? "", address: item.placemark.title ?? "",
            coordinate: Self.resultCoordinate(item.placemark.coordinate))
        } ?? [])
      }
    }
    return promise
  }

  func directions(origin: MapCoordinate, destination: MapCoordinate, transport: MapTransport) throws -> Promise<MapRoute> {
    let promise = Promise<MapRoute>()
    guard Self.valid(origin), Self.valid(destination) else {
      promise.reject(withError: Self.error("E_MAP_INPUT", "MapServices.directions: invalid coordinates"))
      return promise
    }
    DispatchQueue.main.async {
      let request = MKDirections.Request()
      request.source = MKMapItem(placemark: MKPlacemark(coordinate: Self.coordinate(origin)))
      request.destination = MKMapItem(placemark: MKPlacemark(coordinate: Self.coordinate(destination)))
      request.transportType = transport == .walking ? .walking : .automobile
      MKDirections(request: request).calculate { response, error in
        if let error {
          let failure = error as NSError
          promise.reject(withError: Self.error("E_MAP_DIRECTIONS",
            "MapServices.directions: \(error.localizedDescription) (\(failure.domain) \(failure.code))"))
          return
        }
        guard let route = response?.routes.first else {
          promise.reject(withError: Self.error("E_MAP_DIRECTIONS", "MapServices.directions: no route found"))
          return
        }
        var coordinates = Array(repeating: CLLocationCoordinate2D(), count: route.polyline.pointCount)
        route.polyline.getCoordinates(&coordinates, range: NSRange(location: 0, length: coordinates.count))
        promise.resolve(withResult: MapRoute(
          distanceMeters: route.distance,
          expectedTravelTimeSeconds: route.expectedTravelTime,
          polyline: coordinates.map(Self.resultCoordinate),
          steps: route.steps.map {
            MapRouteStep(instructions: $0.instructions, distanceMeters: $0.distance)
          }))
      }
    }
    return promise
  }

  private static func valid(_ point: MapCoordinate) -> Bool {
    point.latitude.isFinite && point.longitude.isFinite &&
      abs(point.latitude) <= 90 && abs(point.longitude) <= 180
  }

  private static func coordinate(_ point: MapCoordinate) -> CLLocationCoordinate2D {
    CLLocationCoordinate2D(latitude: point.latitude, longitude: point.longitude)
  }

  private static func resultCoordinate(_ point: CLLocationCoordinate2D) -> MapCoordinate {
    MapCoordinate(latitude: point.latitude, longitude: point.longitude)
  }

  private static func error(_ code: String, _ message: String) -> RuntimeError {
    oneNativeError(code, message)
  }
}
