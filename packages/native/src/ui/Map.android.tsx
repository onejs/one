import type { MapProps } from './mapTypes'

export function Map(_props: MapProps): never {
  throw new Error('One.UI.Map on Android is not yet implemented')
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
