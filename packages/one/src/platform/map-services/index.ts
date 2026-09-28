import type { MapCoordinate, MapPlace, MapRoute, MapSuggestion, MapTransport } from '../specs/OneMapServices.nitro'

export type { MapCoordinate, MapPlace, MapRoute, MapRouteStep, MapSuggestion, MapTransport } from '../specs/OneMapServices.nitro'

const unsupported = (): never => {
  throw new Error('MapServices requires an iOS native build')
}

export const MapServices = Object.freeze({
  search: (_query: string, _center: MapCoordinate, _radiusMeters = 5000): Promise<MapPlace[]> => unsupported(),
  autocomplete: (_query: string, _center: MapCoordinate, _radiusMeters = 5000): Promise<MapSuggestion[]> => unsupported(),
  resolveSuggestion: (_id: string): Promise<MapPlace> => unsupported(),
  directions: (_origin: MapCoordinate, _destination: MapCoordinate, _transport: MapTransport = 'driving'): Promise<MapRoute> => unsupported(),
})
