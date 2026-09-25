import { createContext, useContext, useMemo } from 'react'
import type { ReservedRegion, ReservedRegionOptions } from './types'

// shared by the native and web providers: the nearest provider's latest
// reading and whether it has taken one yet.
export interface ReservedRegionsSnapshot {
  regions: readonly ReservedRegion[]
  ready: boolean
}

export const ReservedRegionsContext = createContext<ReservedRegionsSnapshot | null>(null)

function useSnapshot(hook: string): ReservedRegionsSnapshot {
  const snapshot = useContext(ReservedRegionsContext)
  if (!snapshot) {
    throw new Error(`One.UI.ReservedRegions.${hook} must be used inside One.UI.ReservedRegions.Provider`)
  }
  return snapshot
}

/**
 * The regions reserved inside the nearest ReservedRegions.Provider, in its
 * coordinates: a `division` (a fold content should not straddle) or an
 * `occlusion` (a camera or system control hiding content). Active regions
 * only unless `includeInactive` is set.
 */
export function useRegions(options?: ReservedRegionOptions): readonly ReservedRegion[] {
  const { regions } = useSnapshot('useRegions')
  const kind = options?.kind
  const includeInactive = options?.includeInactive === true
  return useMemo(
    () =>
      regions.filter(
        (region) => (!kind || region.kind === kind) && (includeInactive || region.isActive)
      ),
    [regions, kind, includeInactive]
  )
}

/**
 * Whether the nearest provider has taken its first reading, an empty one
 * included. It stays true for the provider's lifetime.
 */
export function useReady(): boolean {
  return useSnapshot('useReady').ready
}
