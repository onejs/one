import type {
  HingeState,
  ReservedRegion,
  ReservedRegionKind,
  ReservedRegionOptions,
  SizeClass,
} from './types'

export type * from './types'

const DEFAULT_SIZE_CLASS: SizeClass = {
  horizontal: 'regular',
  vertical: 'regular',
}

export function useSizeClass(): SizeClass {
  return DEFAULT_SIZE_CLASS
}

export async function getSizeClass(): Promise<SizeClass> {
  return DEFAULT_SIZE_CLASS
}

export function useHinge(): HingeState | null {
  return null
}

export async function getHinge(): Promise<HingeState | null> {
  return null
}

export function onHingeChange(_callback: (hinge: HingeState | null) => void): () => void {
  return () => {}
}

export function useReservedRegions(
  _kind?: ReservedRegionKind,
  _options?: ReservedRegionOptions
): ReservedRegion[] {
  return []
}

export async function getReservedRegions(
  _options?: ReservedRegionOptions
): Promise<ReservedRegion[]> {
  return []
}
