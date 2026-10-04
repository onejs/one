import { missingNativeBuild } from '../nativeError'
import type { MapCoordinate, MapPlace, MapRoute, MapSuggestion, MapTransport } from '../specs/OneMapServices.nitro'

export type { MapCoordinate, MapPlace, MapRoute, MapRouteStep, MapSuggestion, MapTransport } from '../specs/OneMapServices.nitro'

export const MapServices = Object.freeze({
  search: (_query: string, _center: MapCoordinate, _radiusMeters = 5000): Promise<MapPlace[]> => Promise.resolve([]),
  autocomplete: (_query: string, _center: MapCoordinate, _radiusMeters = 5000): Promise<MapSuggestion[]> => Promise.resolve([]),
  resolveSuggestion: (_id: string): Promise<MapPlace> => Promise.reject(missingNativeBuild('MapServices.resolveSuggestion')),
  directions: (_origin: MapCoordinate, _destination: MapCoordinate, _transport: MapTransport = 'driving'): Promise<MapRoute> => Promise.reject(missingNativeBuild('MapServices.directions')),
})
