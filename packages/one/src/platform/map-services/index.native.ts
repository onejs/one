import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { MapCoordinate, MapPlace, MapRoute, MapSuggestion, MapTransport, OneMapServices } from '../specs/OneMapServices.nitro'
import { MapServices as unavailableMapServices } from './unavailable'

export type { MapCoordinate, MapPlace, MapRoute, MapRouteStep, MapSuggestion, MapTransport } from '../specs/OneMapServices.nitro'

let hybrid: OneMapServices | undefined

function native(): OneMapServices {
  hybrid ??= NitroModules.createHybridObject<OneMapServices>('OneMapServices')
  return hybrid
}

function search(query: string, center: MapCoordinate, radiusMeters = 5000): Promise<MapPlace[]> {
  return native().search(query, center, radiusMeters).catch(rethrowNativeError)
}

function autocomplete(query: string, center: MapCoordinate, radiusMeters = 5000): Promise<MapSuggestion[]> {
  return native().autocomplete(query, center, radiusMeters).catch(rethrowNativeError)
}

function resolveSuggestion(id: string): Promise<MapPlace> {
  return native().resolveSuggestion(id).catch(rethrowNativeError)
}

function directions(origin: MapCoordinate, destination: MapCoordinate, transport: MapTransport = 'driving'): Promise<MapRoute> {
  return native().directions(origin, destination, transport).catch(rethrowNativeError)
}

const nativeMapServices = Object.freeze({ search, autocomplete, resolveSuggestion, directions })

// android has no platform autocomplete or directions service, so only
// search runs natively; the rest keep their per-method unavailable
// contract instead of kotlin stubs.
const androidMapServices = Object.freeze({
  search: nativeMapServices.search,
  autocomplete: unavailableMapServices.autocomplete,
  resolveSuggestion: unavailableMapServices.resolveSuggestion,
  directions: unavailableMapServices.directions,
})

export const MapServices: typeof nativeMapServices =
  Platform.OS === 'android' ? androidMapServices : nativeMapServices
