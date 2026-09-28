import CoreLocation
import MapKit
import NitroModules

private final class OneMapCompletionRequest: NSObject, MKLocalSearchCompleterDelegate {
  let completer = MKLocalSearchCompleter()
  let onResult: (Result<[MKLocalSearchCompletion], Error>) -> Void

  init(query: String, region: MKCoordinateRegion,
    onResult: @escaping (Result<[MKLocalSearchCompletion], Error>) -> Void) {
    self.onResult = onResult
    super.init()
    completer.delegate = self
    completer.region = region
    completer.queryFragment = query
  }

  func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
    onResult(.success(completer.results))
  }

  func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
    onResult(.failure(error))
  }

  func cancel() {
    completer.cancel()
    completer.delegate = nil
  }
}

final class HybridOneMapServices: HybridOneMapServicesSpec {
  private var activeCompletion: OneMapCompletionRequest?
  private var activeCompletionID: UUID?
  private var activePromise: Promise<[MapSuggestion]>?
  private var savedCompletions: [String: MKLocalSearchCompletion] = [:]

  func search(query: String, center: MapCoordinate, radiusMeters: Double) throws -> Promise<[MapPlace]> {
    let promise = Promise<[MapPlace]>()
    guard Self.validSearch(query: query, center: center, radiusMeters: radiusMeters) else {
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
        promise.resolve(withResult: response?.mapItems.map(Self.place) ?? [])
      }
    }
    return promise
  }

  func autocomplete(query: String, center: MapCoordinate, radiusMeters: Double) throws -> Promise<[MapSuggestion]> {
    let promise = Promise<[MapSuggestion]>()
    guard Self.validSearch(query: query, center: center, radiusMeters: radiusMeters) else {
      promise.reject(withError: Self.error("E_MAP_INPUT", "MapServices.autocomplete: invalid query, center, or radius"))
      return promise
    }
    DispatchQueue.main.async {
      self.cancelActiveCompletion(Self.error("E_MAP_CANCELED", "MapServices.autocomplete: superseded by a newer query"))
      let id = UUID()
      self.activeCompletionID = id
      self.activePromise = promise
      let region = MKCoordinateRegion(center: Self.coordinate(center),
        latitudinalMeters: radiusMeters * 2, longitudinalMeters: radiusMeters * 2)
      self.activeCompletion = OneMapCompletionRequest(query: query, region: region) { [weak self] result in
        DispatchQueue.main.async {
          guard let self, self.activeCompletionID == id else { return }
          self.activeCompletion?.cancel()
          self.activeCompletion = nil
          self.activeCompletionID = nil
          self.activePromise = nil
          switch result {
          case .success(let completions):
            var saved: [String: MKLocalSearchCompletion] = [:]
            let suggestions = completions.map { completion in
              let key = UUID().uuidString
              saved[key] = completion
              return MapSuggestion(id: key, title: completion.title, subtitle: completion.subtitle)
            }
            self.savedCompletions = saved
            promise.resolve(withResult: suggestions)
          case .failure(let error):
            promise.reject(withError: Self.error("E_MAP_AUTOCOMPLETE",
              "MapServices.autocomplete: \(error.localizedDescription)"))
          }
        }
      }
      DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self] in
        guard let self, self.activeCompletionID == id else { return }
        self.cancelActiveCompletion(Self.error("E_MAP_TIMEOUT", "MapServices.autocomplete: query timed out"))
      }
    }
    return promise
  }

  func resolveSuggestion(id: String) throws -> Promise<MapPlace> {
    let promise = Promise<MapPlace>()
    DispatchQueue.main.async {
      guard let completion = self.savedCompletions[id] else {
        promise.reject(withError: Self.error("E_MAP_INPUT", "MapServices.resolveSuggestion: unknown suggestion"))
        return
      }
      MKLocalSearch(request: MKLocalSearch.Request(completion: completion)).start { response, error in
        if let error {
          promise.reject(withError: Self.error("E_MAP_SEARCH",
            "MapServices.resolveSuggestion: \(error.localizedDescription)"))
        } else if let item = response?.mapItems.first {
          promise.resolve(withResult: Self.place(item))
        } else {
          promise.reject(withError: Self.error("E_MAP_SEARCH", "MapServices.resolveSuggestion: no place found"))
        }
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

  private static func validSearch(query: String, center: MapCoordinate, radiusMeters: Double) -> Bool {
    valid(center) && radiusMeters.isFinite && radiusMeters >= 100 && radiusMeters <= 50_000 &&
      !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  private func cancelActiveCompletion(_ error: RuntimeError) {
    activeCompletion?.cancel()
    activeCompletion = nil
    activeCompletionID = nil
    activePromise?.reject(withError: error)
    activePromise = nil
  }

  private static func place(_ item: MKMapItem) -> MapPlace {
    MapPlace(name: item.name ?? "", address: item.placemark.title ?? "",
      coordinate: resultCoordinate(item.placemark.coordinate))
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
