import type {
  CameraPosition,
  Coordinates,
  MapCircle,
  MapMarker,
  MapPolygon,
  MapPolyline,
} from './mapTypes'

// the model both native adapters send: unset strings stay empty and unset
// widths stay 0, and each platform substitutes its own default when it reads
// them. colours are validated here and parsed natively.
export type NativeMapModel = {
  latitude: number
  longitude: number
  zoom: number
  markers: {
    id: string
    title: string
    latitude: number
    longitude: number
    tint: string
  }[]
  overlays: string
}

const defaultCamera: CameraPosition = {
  coordinates: { latitude: 37.7749, longitude: -122.4194 },
  zoom: 12,
}
const hexColor = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i

function coordinates(value: Coordinates | undefined, what: string): Coordinates {
  if (
    !value ||
    !Number.isFinite(value.latitude) ||
    value.latitude < -90 ||
    value.latitude > 90 ||
    !Number.isFinite(value.longitude) ||
    value.longitude < -180 ||
    value.longitude > 180
  )
    throw new Error(
      `One.UI.Map ${what} must be a latitude from -90 to 90 and a longitude from -180 to 180`
    )
  return value
}

function color(value: string | undefined, what: string): string {
  if (value === undefined) return ''
  if (typeof value !== 'string' || !hexColor.test(value))
    throw new Error(`One.UI.Map ${what} must be a #rrggbb or #rrggbbaa string`)
  return value
}

function width(value: number | undefined, what: string): number {
  if (value === undefined) return 0
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`One.UI.Map ${what} must be a finite number at or above 0`)
  return value
}

function uniqueIds(ids: string[], what: string): void {
  if (new Set(ids).size !== ids.length)
    throw new Error(`One.UI.Map ${what} ids must be unique`)
}

function markers(
  value: readonly MapMarker[] | undefined
): NativeMapModel['markers'] {
  const list = value ?? []
  if (!Array.isArray(list)) throw new Error('One.UI.Map markers must be an array')
  uniqueIds(
    list.map((marker) => marker?.id),
    'marker'
  )
  return list.map((marker) => {
    if (typeof marker?.id !== 'string')
      throw new Error('One.UI.Map markers must contain a string id')
    const point = coordinates(marker.coordinates, `marker "${marker.id}" coordinates`)
    if (marker.title !== undefined && typeof marker.title !== 'string')
      throw new Error(`One.UI.Map marker "${marker.id}" title must be a string`)
    return {
      id: marker.id,
      title: marker.title ?? '',
      latitude: point.latitude,
      longitude: point.longitude,
      tint: color(marker.tintColor, `marker "${marker.id}" tintColor`),
    }
  })
}

function overlayPoints(
  value: readonly Coordinates[] | undefined,
  what: string
): { latitude: number; longitude: number }[] {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error(`One.UI.Map ${what} coordinates must be a non-empty array`)
  return value.map((point, index) =>
    coordinates(point, `${what} coordinates[${index}]`)
  )
}

export function resolveNativeMapModel(input: {
  cameraPosition?: CameraPosition
  markers?: readonly MapMarker[]
  polylines?: readonly MapPolyline[]
  polygons?: readonly MapPolygon[]
  circles?: readonly MapCircle[]
}): NativeMapModel {
  const camera = input.cameraPosition ?? defaultCamera
  const center = coordinates(camera.coordinates, 'cameraPosition coordinates')
  if (!camera || !Number.isFinite(camera.zoom))
    throw new Error('One.UI.Map cameraPosition zoom must be a finite number')
  const resolvedMarkers = markers(input.markers)
  const polylines = input.polylines ?? []
  const polygons = input.polygons ?? []
  const circles = input.circles ?? []
  if (!Array.isArray(polylines)) throw new Error('One.UI.Map polylines must be an array')
  if (!Array.isArray(polygons)) throw new Error('One.UI.Map polygons must be an array')
  if (!Array.isArray(circles)) throw new Error('One.UI.Map circles must be an array')
  uniqueIds(
    polylines.map((line) => line?.id),
    'polyline'
  )
  uniqueIds(
    polygons.map((polygon) => polygon?.id),
    'polygon'
  )
  uniqueIds(
    circles.map((circle) => circle?.id),
    'circle'
  )
  for (const line of polylines)
    if (typeof line?.id !== 'string')
      throw new Error('One.UI.Map polylines must contain a string id')
  for (const polygon of polygons)
    if (typeof polygon?.id !== 'string')
      throw new Error('One.UI.Map polygons must contain a string id')
  for (const circle of circles)
    if (typeof circle?.id !== 'string')
      throw new Error('One.UI.Map circles must contain a string id')
  return {
    latitude: center.latitude,
    longitude: center.longitude,
    zoom: camera.zoom,
    markers: resolvedMarkers,
    overlays: JSON.stringify({
      polylines: polylines.map((line: MapPolyline) => ({
        id: line.id,
        coordinates: overlayPoints(line.coordinates, `polyline "${line.id}"`),
        color: color(line.color, `polyline "${line.id}" color`),
        width: width(line.width, `polyline "${line.id}" width`),
      })),
      polygons: polygons.map((polygon: MapPolygon) => ({
        id: polygon.id,
        coordinates: overlayPoints(polygon.coordinates, `polygon "${polygon.id}"`),
        color: color(polygon.color, `polygon "${polygon.id}" color`),
        lineColor: color(polygon.lineColor, `polygon "${polygon.id}" lineColor`),
        lineWidth: width(polygon.lineWidth, `polygon "${polygon.id}" lineWidth`),
      })),
      circles: circles.map((circle: MapCircle) => {
        if (!Number.isFinite(circle.radius) || circle.radius <= 0)
          throw new Error(
            `One.UI.Map circle "${circle.id}" radius must be a positive number of metres`
          )
        return {
          id: circle.id,
          center: coordinates(circle.center, `circle "${circle.id}" center`),
          radius: circle.radius,
          color: color(circle.color, `circle "${circle.id}" color`),
          lineColor: color(circle.lineColor, `circle "${circle.id}" lineColor`),
          lineWidth: width(circle.lineWidth, `circle "${circle.id}" lineWidth`),
        }
      }),
    }),
  }
}
