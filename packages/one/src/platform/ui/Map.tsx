import type { ReactElement } from 'react'
import type { MapProps } from './mapTypes'

// web renders nothing: a web map is the app's own job (the docs point to
// Contrast's MapLibre recipe), the way Icon renders only what the app passes.
export function Map(_props: MapProps): ReactElement | null {
  return null
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
