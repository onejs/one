import { createContext, useContext, useMemo } from 'react'
import type { ReservedRegion, ReservedRegionOptions, WindowSegment } from './types'

// shared by the native and web providers: the nearest provider's latest
// reading and whether it has taken one yet.
export interface ReservedRegionsSnapshot {
  regions: readonly ReservedRegion[]
  ready: boolean
  bounds: { width: number; height: number } | null
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

/**
 * parts of the provider separated by an active full-span division. Put the
 * provider around the full window to read window segments. Until its native
 * reading arrives, the result is empty. An unspanned window has one
 * segment. Occlusions do not divide a window.
 */
export function useSegments(): readonly WindowSegment[] {
  const { bounds, ready, regions } = useSnapshot('useSegments')
  return useMemo(() => {
    if (!ready || !bounds || bounds.width <= 0 || bounds.height <= 0) return []
    return segmentsFor(bounds, regions)
  }, [bounds, ready, regions])
}

/** whether an active division spans the provider. */
export function useSpanning(): boolean {
  return useSegments().length > 1
}

export function segmentsFor(
  bounds: { width: number; height: number },
  regions: readonly ReservedRegion[],
): WindowSegment[] {
  // android converts each pixel edge to a float DIP independently. Allow a
  // subpoint rounding difference when testing whether a fold crosses an edge.
  const edgeTolerance = 0.5
  let segments: WindowSegment[] = [{ x: 0, y: 0, ...bounds }]
  for (const region of regions) {
    if (region.kind !== 'division' || !region.isActive) continue
    const { x, y, width, height } = region.frame
    segments = segments.flatMap((segment) => {
      const right = segment.x + segment.width
      const bottom = segment.y + segment.height
      if (y <= segment.y + edgeTolerance && y + height >= bottom - edgeTolerance && x > segment.x && x + width < right) {
        return [
          { x: segment.x, y: segment.y, width: x - segment.x, height: segment.height },
          { x: x + width, y: segment.y, width: right - x - width, height: segment.height },
        ]
      }
      if (x <= segment.x + edgeTolerance && x + width >= right - edgeTolerance && y > segment.y && y + height < bottom) {
        return [
          { x: segment.x, y: segment.y, width: segment.width, height: y - segment.y },
          { x: segment.x, y: y + height, width: segment.width, height: bottom - y - height },
        ]
      }
      return [segment]
    })
  }
  return segments.sort((a, b) => a.y - b.y || a.x - b.x)
}
