import * as ReservedRegions from './ReservedRegions'

export type * from './types'
export { ReservedRegions }
export {
  useRegions as useReservedRegions,
  useReady as useReservedRegionsReady,
  useSegments as useWindowSegments,
  useSpanning,
} from './reservedRegionsContext'
export * from './fixed'
