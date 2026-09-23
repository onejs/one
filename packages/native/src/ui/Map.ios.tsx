import NativeUiMap from '../specs/OneNativeUiMapNativeComponent'
import type { MapProps } from './mapTypes'
import { resolveNativeMapModel } from './mapValidation'

// uniform map on ios: the same SwiftUI Map that backs Swift.Map, driven by a
// google-style zoom. native reports a marker tap as an id; the marker object
// comes back from the props the app passed.
export function Map({
  cameraPosition,
  markers,
  polylines,
  polygons,
  circles,
  onCameraMove,
  onMarkerClick,
  onMapClick,
  style,
  testID,
  accessibilityLabel,
}: MapProps) {
  const model = resolveNativeMapModel({
    cameraPosition,
    markers,
    polylines,
    polygons,
    circles,
  })
  return (
    <NativeUiMap
      style={style}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      latitude={model.latitude}
      longitude={model.longitude}
      zoom={model.zoom}
      markers={model.markers}
      overlays={model.overlays}
      onNativeUiMapCameraMove={({ nativeEvent }) =>
        onCameraMove?.({
          coordinates: {
            latitude: nativeEvent.latitude,
            longitude: nativeEvent.longitude,
          },
          zoom: nativeEvent.zoom,
        })
      }
      onNativeUiMapMarkerClick={({ nativeEvent }) => {
        const marker = (markers ?? []).find((item) => item.id === nativeEvent.id)
        if (marker) onMarkerClick?.(marker)
      }}
      onNativeUiMapClick={({ nativeEvent }) =>
        onMapClick?.({
          coordinates: {
            latitude: nativeEvent.latitude,
            longitude: nativeEvent.longitude,
          },
        })
      }
    />
  )
}

export type {
  CameraPosition,
  Coordinates,
  MapCircle,
  MapMarker,
  MapPolygon,
  MapPolyline,
  MapProps,
} from './mapTypes'
