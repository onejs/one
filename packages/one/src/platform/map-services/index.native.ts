import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { MapCoordinate, MapPlace, MapRoute, MapTransport, OneMapServices } from '../specs/OneMapServices.nitro'

export type { MapCoordinate, MapPlace, MapRoute, MapRouteStep, MapTransport } from '../specs/OneMapServices.nitro'

let hybrid: OneMapServices | undefined

function native(): OneMapServices {
  if (Platform.OS !== 'ios') throw new Error('MapServices requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneMapServices>('OneMapServices')
  return hybrid
}

function search(query: string, center: MapCoordinate, radiusMeters = 5000): Promise<MapPlace[]> {
  return native().search(query, center, radiusMeters).catch(rethrowNativeError)
}

function directions(origin: MapCoordinate, destination: MapCoordinate, transport: MapTransport = 'driving'): Promise<MapRoute> {
  return native().directions(origin, destination, transport).catch(rethrowNativeError)
}

export const MapServices = Object.freeze({ search, directions })
