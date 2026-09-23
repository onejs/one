import MapKit
import SwiftUI
import UIKit

// uniform map (One.UI.Map): the same SwiftUI Map that backs Swift.Map, driven by a
// google-style zoom instead of a camera distance. the camera seeds from props and
// re-seeds only when the props move; the user pans and zooms freely in between.
struct OneNativeUiMapMarker: Equatable {
  let id: String
  let title: String
  let latitude: Double
  let longitude: Double
  let tint: String
  // js validates strictly, so these defaults never trigger through the public
  // props; they keep a malformed bridge dictionary from crashing the parse.
  init(_ item: [String: Any]) {
    id = item["id"] as? String ?? ""
    title = item["title"] as? String ?? ""
    latitude = item["latitude"] as? Double ?? 0
    longitude = item["longitude"] as? Double ?? 0
    tint = item["tint"] as? String ?? ""
  }
}

// overlays cross as one json string: polylines and polygons carry nested
// coordinate lists, which fabric object props cannot spell.
private struct UiMapPoint: Decodable, Equatable {
  let latitude: Double
  let longitude: Double
}

private struct UiMapPolyline: Decodable, Equatable {
  let id: String
  let coordinates: [UiMapPoint]
  let color: String
  let width: Double
}

private struct UiMapPolygon: Decodable, Equatable {
  let id: String
  let coordinates: [UiMapPoint]
  let color: String
  let lineColor: String
  let lineWidth: Double
}

private struct UiMapCircle: Decodable, Equatable {
  let id: String
  let center: UiMapPoint
  let radius: Double
  let color: String
  let lineColor: String
  let lineWidth: Double
}

private struct UiMapOverlays: Decodable, Equatable {
  let polylines: [UiMapPolyline]
  let polygons: [UiMapPolygon]
  let circles: [UiMapCircle]
  static let empty = UiMapOverlays(polylines: [], polygons: [], circles: [])
}

// #rrggbb or #rrggbbaa, the only shapes js lets through. empty means unset.
private func uiMapColor(_ hex: String) -> Color? {
  guard hex.hasPrefix("#") else { return nil }
  let digits = String(hex.dropFirst())
  guard digits.count == 6 || digits.count == 8, let value = UInt64(digits, radix: 16) else {
    return nil
  }
  if digits.count == 6 {
    return Color(
      red: Double((value >> 16) & 0xFF) / 255,
      green: Double((value >> 8) & 0xFF) / 255,
      blue: Double(value & 0xFF) / 255
    )
  }
  return Color(
    red: Double((value >> 24) & 0xFF) / 255,
    green: Double((value >> 16) & 0xFF) / 255,
    blue: Double((value >> 8) & 0xFF) / 255,
    opacity: Double(value & 0xFF) / 255
  )
}

private final class UiMapModel: ObservableObject {
  @Published var latitude: Double = 37.7749
  @Published var longitude: Double = -122.4194
  @Published var zoom: Double = 12
  @Published var markers: [OneNativeUiMapMarker] = []
  @Published var overlays: UiMapOverlays = .empty
  var active = false
  var onCameraMove: ((Double, Double, Double) -> Void)?
  var onMarkerClick: ((String) -> Void)?
  var onMapClick: ((Double, Double) -> Void)?
  func cameraMove(latitude: Double, longitude: Double, zoom: Double) {
    guard active else { return }
    onCameraMove?(latitude, longitude, zoom)
  }
  func markerClick(id: String) {
    guard active else { return }
    onMarkerClick?(id)
  }
  func mapClick(latitude: Double, longitude: Double) {
    guard active else { return }
    onMapClick?(latitude, longitude)
  }
}

@objcMembers public final class OneNativeUiMapView: UIView {
  public var onCameraMove: ((Double, Double, Double) -> Void)?
  public var onMarkerClick: ((String) -> Void)?
  public var onMapClick: ((Double, Double) -> Void)?
  private var model = UiMapModel()
  private var controller: OneNativeHostingController<OneNativeStandalone<UiMapContent>>?
  public override init(frame: CGRect) { super.init(frame: frame) }
  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
  public func configure(_ latitude: Double, longitude: Double, zoom: Double) {
    if model.latitude != latitude { model.latitude = latitude }
    if model.longitude != longitude { model.longitude = longitude }
    if model.zoom != zoom { model.zoom = zoom }
  }
  public func setMarkers(_ items: [[String: Any]]) {
    let next = items.map { OneNativeUiMapMarker($0) }
    if model.markers != next { model.markers = next }
  }
  public func setOverlays(_ json: String) {
    guard
      let data = json.data(using: .utf8),
      let next = try? JSONDecoder().decode(UiMapOverlays.self, from: data)
    else {
      if model.overlays != .empty { model.overlays = .empty }
      return
    }
    if model.overlays != next { model.overlays = next }
  }
  public override func didMoveToWindow() { super.didMoveToWindow(); updateHost() }
  public override func layoutSubviews() { super.layoutSubviews(); updateHost() }
  private func bindCallbacks() {
    model.onCameraMove = { [weak self] latitude, longitude, zoom in
      self?.onCameraMove?(latitude, longitude, zoom)
    }
    model.onMarkerClick = { [weak self] id in self?.onMarkerClick?(id) }
    model.onMapClick = { [weak self] latitude, longitude in
      self?.onMapClick?(latitude, longitude)
    }
  }
  private func updateHost() {
    model.active = false
    guard window != nil else { controller?.detach(); return }
    if controller == nil {
      bindCallbacks()
      controller = OneNativeHostingController(
        rootView: OneNativeStandalone(content: UiMapContent(model: model))
      )
    }
    controller?.attach(to: self)
    model.active = controller?.parent != nil
  }
  public func reset() {
    model.active = false
    model.onCameraMove = nil
    model.onMarkerClick = nil
    model.onMapClick = nil
    controller?.detach()
    controller = nil
    model = UiMapModel()
  }
}

private struct UiMapContent: View {
  @ObservedObject var model: UiMapModel
  var body: some View {
    UiMapSurface(
      latitude: model.latitude,
      longitude: model.longitude,
      zoom: model.zoom,
      markers: model.markers,
      overlays: model.overlays,
      onCameraMove: { latitude, longitude, zoom in
        model.cameraMove(latitude: latitude, longitude: longitude, zoom: zoom)
      },
      onMarkerClick: { id in model.markerClick(id: id) },
      onMapClick: { latitude, longitude in
        model.mapClick(latitude: latitude, longitude: longitude)
      }
    )
  }
}

// google's zoom, natively: at zoom z the world is 256 * 2^z points wide, so a
// widthPt-wide frame shows longitudeDelta = 360 / 2^z * widthPt / 256. the seed
// writes that span and the report inverts it, which is what keeps both directions
// in the same definition. the latitude span is aspect-corrected in meters so
// MapKit has nothing to expand to fit the frame.
private struct UiMapSurface: View {
  let latitude: Double
  let longitude: Double
  let zoom: Double
  let markers: [OneNativeUiMapMarker]
  let overlays: UiMapOverlays
  let onCameraMove: (Double, Double, Double) -> Void
  let onMarkerClick: (String) -> Void
  let onMapClick: (Double, Double) -> Void
  @State private var position: MapCameraPosition = .automatic
  @State private var selection: String?
  @State private var seeded: String?
  @State private var widthPt: CGFloat = 0
  @State private var heightPt: CGFloat = 0
  var body: some View {
    GeometryReader { geometry in
      MapReader { proxy in
        Map(position: $position, selection: $selection) {
          ForEach(markers, id: \.id) { marker in
            Marker(
              coordinate: CLLocationCoordinate2D(
                latitude: marker.latitude,
                longitude: marker.longitude
              )
            ) {
              Text(marker.title)
            }
            .tag(marker.id)
            .tint(tint(marker.tint))
          }
          ForEach(overlays.polylines, id: \.id) { line in
            MapPolyline(coordinates: line.coordinates.map { $0.clLocation })
              .stroke(
                uiMapColor(line.color) ?? Color.black,
                lineWidth: line.width > 0 ? line.width : 2
              )
          }
          ForEach(overlays.polygons, id: \.id) { polygon in
            MapPolygon(coordinates: polygon.coordinates.map { $0.clLocation })
              .foregroundStyle(uiMapColor(polygon.color) ?? Color.clear)
              .stroke(
                uiMapColor(polygon.lineColor) ?? Color.black,
                lineWidth: polygon.lineWidth > 0 ? polygon.lineWidth : 2
              )
          }
          ForEach(overlays.circles, id: \.id) { circle in
            MapCircle(
              center: circle.center.clLocation,
              radius: max(circle.radius, 0)
            )
            .foregroundStyle(uiMapColor(circle.color) ?? Color.clear)
            .stroke(
              uiMapColor(circle.lineColor) ?? Color.black,
              lineWidth: circle.lineWidth > 0 ? circle.lineWidth : 2
            )
          }
        }
        .onMapCameraChange(frequency: .onEnd) { context in
          report(context.region)
        }
        .onTapGesture { location in
          tap(proxy: proxy, location: location)
        }
        .onChange(of: selection) { _, id in
          // a tap reports through selection, then clears it so tapping the
          // same pin again is a new change instead of a silent no-op.
          guard let id else { return }
          selection = nil
          onMarkerClick(id)
        }
      }
      .onAppear {
        widthPt = geometry.size.width
        heightPt = geometry.size.height
        seed()
      }
      .onChange(of: camera) { seed() }
      .onChange(of: geometry.size) { _, size in
        widthPt = size.width
        heightPt = size.height
        seed()
      }
    }
  }
  private var camera: String { "\(latitude),\(longitude),\(zoom),\(Int(widthPt))" }
  private func seed() {
    guard seeded != camera, widthPt > 0, heightPt > 0 else { return }
    seeded = camera
    let longitudeDelta = 360 / pow(2, zoom) * widthPt / 256
    let metersPerDegLng = 111_320 * cos(latitude * .pi / 180)
    let latitudeDelta = longitudeDelta * metersPerDegLng * heightPt / widthPt / 111_320
    position = .region(
      MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
        span: MKCoordinateSpan(latitudeDelta: latitudeDelta, longitudeDelta: longitudeDelta)
      )
    )
  }
  private func report(_ region: MKCoordinateRegion) {
    let delta = region.span.longitudeDelta
    guard delta > 0, widthPt > 0 else { return }
    onCameraMove(
      region.center.latitude,
      region.center.longitude,
      log2(360 * widthPt / 256 / delta)
    )
  }
  private func tap(proxy: MapProxy, location: CGPoint) {
    // a pin tap can reach both selection and this gesture. a tap within a
    // pin's touch target belongs to the marker, so only the rest report.
    for marker in markers {
      let point = proxy.convert(
        CLLocationCoordinate2D(latitude: marker.latitude, longitude: marker.longitude),
        to: .local
      )
      if let point, point.distance(to: location) < 24 { return }
    }
    guard let coordinate = proxy.convert(location, from: .local) else { return }
    onMapClick(coordinate.latitude, coordinate.longitude)
  }
  private func tint(_ hex: String) -> Color {
    uiMapColor(hex) ?? Color.red
  }
}

private extension UiMapPoint {
  var clLocation: CLLocationCoordinate2D {
    CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
  }
}

private extension CGPoint {
  func distance(to other: CGPoint) -> CGFloat {
    sqrt(pow(x - other.x, 2) + pow(y - other.y, 2))
  }
}
