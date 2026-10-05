import { MapServices as nativeServices } from './index.native'
import { MapServices as unavailable } from './unavailable'

export type {
  MapCoordinate,
  MapPlace,
  MapRoute,
  MapRouteStep,
  MapSuggestion,
  MapTransport,
} from '../specs/OneMapServices.nitro'

// android has no platform autocomplete or directions service, so only
// search runs natively; the rest keep their per-method unavailable
// contract instead of kotlin stubs.
export const MapServices = Object.freeze({
  search: nativeServices.search,
  autocomplete: unavailable.autocomplete,
  resolveSuggestion: unavailable.resolveSuggestion,
  directions: unavailable.directions,
})
