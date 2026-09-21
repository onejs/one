# One native map

**Recommendation (INFERRED):** add `One.UI.Map`, a deliberately small uniform map whose
prop and event names are a subset of `expo-maps` (`AppleMaps.View` and `GoogleMaps.View`).
It covers markers, one camera, three overlay kinds and three events. iOS renders it with the
SwiftUI `Map` that already backs `One.iOS.Map`. Android renders it with Google Maps
Compose. Everything else about maps is excluded, and this document names each excluded
item so the surface cannot grow by accident. Android's Maps SDK is only compiled in when
the app sets an API key in `native.app`, using the same optional source set mechanism as
the notifications design.

Scope: written design against `origin/v2-beta` at `8afc4a8eb`. Nothing was built or run
for this document.

## Why a small wrapper, not react-native-maps

Owner direction (Nate): keep a simple wrapper over the platform-native maps. react-native-maps would add a third-party native view layer on iOS where the SwiftUI Map already backs One.iOS.Map, plus its own Android view and JS API to track, for a surface this design deliberately keeps to markers, one camera, three overlay kinds and three events. A thin One wrapper over MapKit on iOS and Google Maps Compose on Android is smaller to ship, carries no extra native dependency on iOS, and keeps the prop names aligned with expo-maps instead of adding a second mapping layer.

## Evidence

- **RAN (read):** `One.iOS` spreads `Swift` (`packages/one/src/one.ts:71-72`), and
  `Swift.Map` is the generated `Map` (`packages/native/src/generated/Controls.native.tsx:759`).
  Its props are `latitude`, `longitude`, `distance`, `markers` of `{ id, label, latitude,
  longitude }` and `onRegionChange(latitude, longitude, distance)`
  (`generated/controlTypes.ts:79-84,244-250`). The native view seeds a SwiftUI camera from
  props, re-seeds only when the props change, and reports only when a gesture ends
  (`packages/native/ios/Generated/OneNativeMapView.swift:94-96,118,125-137`). It is generated
  from `packages/native/codegen/mapCatalog.ts:5-9`, so changes go in the catalog. Its
  `setMarkers` uses `as!` force casts (`OneNativeMapView.swift:42`).
- **RAN (read):** the iOS `map` conformance suite exists (`tests/native-features/scripts/one-native-conformance.ts:42,2451-2491`)
  with fixture `tests/native-features/fixtures/one-native-map.tsx:72`. Android has no map:
  `Compose` lists no map (`packages/native/src/compose.android.tsx:524-537`) and
  `@vxrn/native`'s Android dependencies have no Maps SDK (`packages/native/android/build.gradle:78-87`).
- **RAN (read):** the precedent for a uniform component is `One.UI.Icon`: platform files
  `packages/native/src/ui/Icon.{ios,android,}.tsx`, exported at
  `packages/native/src/effects/index.ts:11` and spread into `One.UI` (`one.ts:95-100`).
  Its web file renders only what the app passes for web (`ui/Icon.tsx:4-6`).
- **RAN (read):** expo-maps (canary 58, as installed in Contrast): `CameraPosition` is
  `{ coordinates, zoom }` (`src/shared.types.ts:15-26`). `onCameraMove` carries
  coordinates, zoom, tilt, bearing and deltas (`:31-61`). The Apple marker has `id`,
  `coordinates`, `title` and `tintColor` (`src/apple/AppleMaps.types.ts:25-57`). Polylines,
  circles and polygons are at `:379-469`, and view props and events at `:475-566`. Android
  uses `com.google.maps.android:maps-compose:6.10.0` (`android/build.gradle:41`).
- **RAN (read):** Contrast apps use `react-native-maps` 1.27.2 (`packages/shell/package.json:64`),
  driven by state props with markers as children. Imperative ref methods are not wired
  there (`~/contrast/src/ai/skills/docs/contrast-maps.md:51-64`). Web maps are the app's own
  job with MapLibre (`:23-26`), which converts with `zoom = log2(360 / longitudeDelta)` (`:143`).
- **RAN (read):** the iOS 26.4 SDK's `_MapKit_SwiftUI` interface has `MapPolyline` (`:999`),
  `MapPolygon` (`:528`), `MapCircle` (`:932`), `MapReader` with
  `convert(_:from:)` (`:632,645`, iOS 17), `MapCameraUpdateContext.region` (`:431`) and a
  `Map(position:selection:content:)` initializer (`:482`). All of them fit the iOS 17
  package floor (`packages/native/schema.json:4`).

## Surface (exact)

```ts
type Coordinates = Readonly<{ latitude: number; longitude: number }>
type CameraPosition = Readonly<{ coordinates: Coordinates; zoom: number }>
type MapMarker = Readonly<{ id: string; coordinates: Coordinates; title?: string; tintColor?: string }>
type MapPolyline = Readonly<{ id: string; coordinates: readonly Coordinates[]; color?: string; width?: number }>
type MapPolygon = Readonly<{ id: string; coordinates: readonly Coordinates[]; color?: string; lineColor?: string; lineWidth?: number }>
type MapCircle = Readonly<{ id: string; center: Coordinates; radius: number; color?: string; lineColor?: string; lineWidth?: number }>

interface MapProps {
  style?: StyleProp<ViewStyle>
  testID?: string
  accessibilityLabel?: string
  cameraPosition?: CameraPosition
  markers?: readonly MapMarker[]
  polylines?: readonly MapPolyline[]
  polygons?: readonly MapPolygon[]
  circles?: readonly MapCircle[]
  onCameraMove?: (event: { coordinates: Coordinates; zoom: number }) => void
  onMarkerClick?: (marker: MapMarker) => void
  onMapClick?: (event: { coordinates: Coordinates }) => void
}
```

- **Camera.** It works the same as `Swift.Map` today: `cameraPosition` seeds the camera and
  re-centres it when its value changes, and the user pans freely in between. It is
  deliberately uncontrolled (README `packages/native/README.md:580-583`). `onCameraMove`
  keeps Expo's name but fires once, when a gesture ends. That matches iOS `.onEnd`
  (`OneNativeMapView.swift:118`) and the moment Compose's `cameraPositionState.isMoving`
  turns false. Its payload is the subset both platforms report exactly.
- **Zoom on iOS.** MapKit has no zoom level. The Swift view converts natively: it sets the
  camera to `.region` with `longitudeDelta = 360 / 2^zoom × widthPt / 256`, and reports
  `zoom = log2(360 × widthPt / 256 / region.longitudeDelta)` from the context region.
  **GUESSED:** this matches Google's zoom within one level on the same frame. The suite
  measures it. There is no JS conversion.
- **Differences from expo-maps, made on purpose:** every `id` is required and must be
  unique (JS throws, like `Controls.native.tsx:769-789`), coordinates are required,
  colours are `#rrggbb` or `#rrggbbaa` strings parsed natively, and `onMarkerClick` passes
  the marker object from props, found by the id native reports.
- **iOS implementation.** Grow `mapCatalog.ts`. The native marker becomes
  `{ id, title, latitude, longitude, tint }`, overlays render as `MapPolyline`, `MapPolygon`
  and `MapCircle`, and taps go through `MapReader` for `onMapClick` and `selection` for
  `onMarkerClick`. The camera input accepts either `distance` (sent by `Swift.Map`) or `zoom`
  (sent by `One.UI.Map`). `Swift.Map`'s public props stay exactly as they are, and its adapter
  renames `label` to `title` when it sends markers. Parsing replaces the `as!` casts with
  typed decoding.
- **Android implementation.** A new view manager, `OneNativeMapManager`, registered in
  `VxrnNativePackage.createViewManagers` (`VxrnNativePackage.kt:56-65`), hosts a
  `ComposeView` running `GoogleMap(cameraPositionState)` with `Marker`, `Polyline`,
  `Polygon` and `Circle`, plus `onMapClick` and `onMarkerClick` that return `true` after
  emitting. It stays out of the Compose node tree (`OneNativeComposeNodeView.kt:800`): a map
  is a leaf with heavy state, and a separate manager keeps the Maps SDK out of that file.
- **Web.** `ui/Map.tsx` renders `null` and the docs point to Contrast's MapLibre recipe.
  Like `Icon`, the app supplies its own `.web.tsx` when it needs a web map.

## Android key handling at prebuild

```ts
native: { app: { android: { googleMapsApiKey?: string } } }
```

The field lives in `NativeAppManifest` (`packages/one/src/native/appManifest.ts:27-34`) and
vxrn's validator (`packages/vxrn/src/exports/prebuildWithoutExpo.ts:121`). Because the config
is TypeScript, apps write `googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY`. When the key
is set, prebuild does three things. It stamps
`<meta-data android:name="com.google.android.geo.API_KEY" android:value="${googleMapsApiKey}"/>`
into `<application>`, using the manifest patch style of `prebuildWithoutExpo.ts:474-489`. It
sets `manifestPlaceholders = [googleMapsApiKey: ...]` in `app/build.gradle` from the configured
value, so the literal key sits in one generated file. And it writes `oneNativeMaps=true` to
`gradle.properties`. `packages/native/android/build.gradle` then adds `src/maps/java` and
`maps-compose` plus `play-services-maps`. Without the flag it adds `src/nomaps/java`, whose
manager renders a view that throws on mount with `One.UI.Map on Android needs
native.app.android.googleMapsApiKey`. **INFERRED:** `com.google.android.geo.API_KEY` is the
Maps SDK's documented key name. iOS needs no key or entitlement.

## Excluded

User location, the my-location button and location permissions (these need Info.plist
strings and belong in a location API). Map type, traffic, points-of-interest filters,
buildings and 3D, tilt and bearing. Custom marker images or React children as markers,
callouts, info windows and draggable markers. Annotations, clustering, heatmaps, tile
overlays, GeoJSON and KML. Imperative refs (`setCameraPosition`, `animateCamera`,
`selectMarker`), Look Around and Street View. UI settings (compass, scale, zoom
controls). Map styling and colour scheme. Mapbox and MapLibre. A web map implementation.
Each of these can be added later without breaking anything; none is needed for the shape
Contrast teaches (`contrast-maps.md:83-116`: points with id, coordinate, label and colour,
plus a camera).

## Slices

1. **M1 iOS.** Catalog changes, `ui/Map.{ios,android,}.tsx` (Android throws "not yet"),
   `One.UI.Map` export, fixture `tests/native-features/fixtures/one-native-ui-map.tsx`, and a
   `ui-map` entry in `suites`. The suite asserts marker titles in the accessibility tree (as
   `map` does at `:2481-2484`), overlay pixels through the pixel gate, a marker tap and a map
   tap reported in fixture status labels, and zoom read back after a pinch. The existing
   `map` suite must stay green, which proves `Swift.Map` did not change.
2. **M2 Android.** Prebuild key stamp and flag, both source sets, the manager, and the
   `one-native-android` flow step (`one-native-conformance.android.ts:793`) with the same
   assertions through uiautomator. **Blocker to resolve at M2:** the fixture app needs a
   Maps API key restricted to its package and signing certificate. Without one, tiles
   stay blank, and only markers and overlays can be asserted.
3. **M3 docs.** `## Map` in `apps/onestack.dev/data/docs/native-features.mdx`, listing
   the migration from `expo-maps` and `react-native-maps` and the exclusions above.

Unit tests cover the JS validation only (ids, coordinates, colours).
