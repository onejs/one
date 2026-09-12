import type { Control } from './controlTypes'

export const mapControls: Control[] = [
  {
    name: 'Map',
    // a map has no ideal height to report, so it takes the box React Native gave it.
    layout: 'fill',
    // importing MapKit alongside SwiftUI is what loads the _MapKit_SwiftUI overlay.
    imports: ['MapKit'],
    // panning is the user moving the camera, not React, so it is reported one way. the
    // camera is not a controlled value: the protocol carries one scalar and a camera is
    // three, and a map the caller could snap back mid-gesture would be unusable anyway.
    actions: [
      {
        prop: 'onRegionChange',
        event: 'RegionChange',
        payload: { latitude: 'Double', longitude: 'Double', distance: 'Double' },
      },
    ],
    fields: {
      latitude: { type: 'Double', default: 37.7749 },
      longitude: { type: 'Double', default: -122.4194 },
      // metres from the camera to the ground, which is how MapCamera frames a map.
      distance: { type: 'Double', default: 5000 },
      markers: {
        type: 'objects',
        default: '',
        payload: {
          name: 'MapMarker',
          element: {
            id: 'string',
            label: 'string',
            latitude: 'Double',
            longitude: 'Double',
          },
        },
      },
    },
    constructors: [
      {
        type: 'Map',
        parameters: [
          {
            label: 'position',
            type: 'SwiftUICore.Binding<_MapKit_SwiftUI.MapCameraPosition>',
          },
          { label: 'bounds', type: '_MapKit_SwiftUI.MapCameraBounds?' },
          { label: 'interactionModes', type: '_MapKit_SwiftUI.MapInteractionModes' },
          { label: 'scope', type: 'SwiftUICore.Namespace.ID?' },
          { label: 'content', type: '() -> C' },
        ],
      },
      {
        type: 'Marker',
        parameters: [
          { label: 'coordinate', type: '_LocationEssentials.CLLocationCoordinate2D' },
          { label: 'label', type: '() -> Label' },
        ],
      },
    ],
    methods: [
      {
        name: 'onMapCameraChange',
        parameters: [
          { label: 'frequency', type: '_MapKit_SwiftUI.MapCameraUpdateFrequency' },
          {
            label: '_',
            type: '@escaping (_MapKit_SwiftUI.MapCameraUpdateContext) -> Swift.Void',
          },
        ],
        requirements: [],
      },
    ],
    swift: `MapSurface(
        latitude: model.latitude,
        longitude: model.longitude,
        distance: model.distance,
        markers: model.markers,
        onRegionChange: { latitude, longitude, distance in
          model.regionChange(latitude, longitude, distance)
        }
      )`,
    extraSwift: `// the camera is SwiftUI state so a pan is not fought by the next render, and it is
// re-seeded only when the props describing it actually move. driving it straight from the
// props would snap the map back to the prop value every time anything else changed.
private struct MapSurface: View {
  let latitude: Double
  let longitude: Double
  let distance: Double
  let markers: [OneNativeMapMarker]
  let onRegionChange: (Double, Double, Double) -> Void
  @State private var position: MapCameraPosition = .automatic
  @State private var seeded: String?
  var body: some View {
    Map(position: $position) {
      ForEach(markers, id: \\.id) { marker in
        Marker(
          coordinate: CLLocationCoordinate2D(
            latitude: marker.latitude,
            longitude: marker.longitude
          )
        ) {
          Text(marker.label)
        }
      }
    }
    .onMapCameraChange(frequency: .onEnd) { context in
      onRegionChange(
        context.camera.centerCoordinate.latitude,
        context.camera.centerCoordinate.longitude,
        context.camera.distance
      )
    }
    .onAppear { seed() }
    .onChange(of: camera) { seed() }
  }
  private var camera: String { "\\(latitude),\\(longitude),\\(distance)" }
  private func seed() {
    guard seeded != camera else { return }
    seeded = camera
    position = .camera(
      MapCamera(
        centerCoordinate: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
        distance: distance
      )
    )
  }
}
`,
    validate: `  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('Map latitude must be between -90 and 90')
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('Map longitude must be between -180 and 180')
  if (!Number.isFinite(distance) || distance <= 0) throw new Error('Map distance must be a positive number of metres')
  if (!Array.isArray(markers) || markers.some(marker => typeof marker?.id !== 'string' || typeof marker?.label !== 'string' || !Number.isFinite(marker?.latitude) || !Number.isFinite(marker?.longitude))) throw new Error('Map markers must contain string id and label fields and finite latitude and longitude')
  if (new Set(markers.map(marker => marker.id)).size !== markers.length) throw new Error('Map marker ids must be unique')`,
  },
]
