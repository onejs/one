import type { HybridObject } from 'react-native-nitro-modules'

export interface MapCoordinate {
  latitude: number
  longitude: number
}

export interface MapPlace {
  name: string
  address: string
  coordinate: MapCoordinate
}

export interface MapRouteStep {
  instructions: string
  distanceMeters: number
}

export interface MapRoute {
  distanceMeters: number
  expectedTravelTimeSeconds: number
  polyline: MapCoordinate[]
  steps: MapRouteStep[]
}

export type MapTransport = 'driving' | 'walking'

export interface OneMapServices extends HybridObject<{ ios: 'swift' }> {
  search(query: string, center: MapCoordinate, radiusMeters: number): Promise<MapPlace[]>
  directions(origin: MapCoordinate, destination: MapCoordinate, transport: MapTransport): Promise<MapRoute>
}
