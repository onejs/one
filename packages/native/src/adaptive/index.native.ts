import { useEffect, useState, useSyncExternalStore } from 'react'
import { NativeEventEmitter, NativeModules, Platform } from 'react-native'
import type {
  HingeState,
  ReservedRegion,
  ReservedRegionKind,
  ReservedRegionOptions,
  SizeClass,
} from './types'

export type * from './types'

const NativeAdaptive = NativeModules.OneNativeAdaptive

const DEFAULT_SIZE_CLASS: SizeClass = {
  horizontal: 'unspecified',
  vertical: 'unspecified',
}

function getInitialConstants() {
  if (Platform.OS !== 'ios' || !NativeAdaptive) {
    return {
      initialSizeClass: DEFAULT_SIZE_CLASS,
      initialHinge: null,
      initialReservedRegions: [] as ReservedRegion[],
    }
  }
  const constants =
    typeof NativeAdaptive.getConstants === 'function'
      ? NativeAdaptive.getConstants()
      : NativeAdaptive
  return {
    initialSizeClass: (constants?.initialSizeClass as SizeClass) ?? DEFAULT_SIZE_CLASS,
    initialHinge: (constants?.initialHinge as HingeState | null) ?? null,
    initialReservedRegions: (constants?.initialReservedRegions as ReservedRegion[]) ?? [],
  }
}

const emitter = Platform.OS === 'ios' && NativeAdaptive ? new NativeEventEmitter(NativeAdaptive) : null

let currentSizeClass: SizeClass = getInitialConstants().initialSizeClass
let currentHinge: HingeState | null = getInitialConstants().initialHinge
let currentReservedRegions: ReservedRegion[] = getInitialConstants().initialReservedRegions

const sizeClassListeners = new Set<() => void>()
const hingeListeners = new Set<() => void>()
const reservedRegionsListeners = new Set<() => void>()

if (emitter) {
  emitter.addListener('oneNativeSizeClassDidChange', (event: SizeClass) => {
    currentSizeClass = event
    sizeClassListeners.forEach((listener) => listener())
  })
  emitter.addListener('oneNativeHingeDidChange', (event: HingeState | null) => {
    currentHinge = event
    hingeListeners.forEach((listener) => listener())
  })
  emitter.addListener('oneNativeReservedRegionsDidChange', (event: ReservedRegion[]) => {
    currentReservedRegions = event
    reservedRegionsListeners.forEach((listener) => listener())
  })
}

/**
 * Returns the window scene's horizontal and vertical UIUserInterfaceSizeClass as live React state.
 * Updated live via native trait change registration on UIWindowScene without polling.
 */
export function useSizeClass(): SizeClass {
  return useSyncExternalStore(
    (onStoreChange) => {
      sizeClassListeners.add(onStoreChange)
      return () => {
        sizeClassListeners.delete(onStoreChange)
      }
    },
    () => currentSizeClass,
    () => DEFAULT_SIZE_CLASS
  )
}

export async function getSizeClass(): Promise<SizeClass> {
  if (Platform.OS !== 'ios' || !NativeAdaptive?.getSizeClass) {
    return DEFAULT_SIZE_CLASS
  }
  return await NativeAdaptive.getSizeClass()
}

/**
 * Returns the current hardware hinge state (angle in radians and status) from UIHinge / DeviceHinge.
 */
export function useHinge(): HingeState | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      hingeListeners.add(onStoreChange)
      return () => {
        hingeListeners.delete(onStoreChange)
      }
    },
    () => currentHinge,
    () => null
  )
}

export async function getHinge(): Promise<HingeState | null> {
  if (Platform.OS !== 'ios' || !NativeAdaptive?.getHinge) {
    return null
  }
  return await NativeAdaptive.getHinge()
}

/**
 * Subscribes to hardware hinge changes.
 */
export function onHingeChange(callback: (hinge: HingeState | null) => void): () => void {
  if (!emitter) return () => {}
  const sub = emitter.addListener('oneNativeHingeDidChange', callback)
  return () => sub.remove()
}

/**
 * Returns the current reserved regions (e.g. hinge division, occlusion) from UIView.reservedRegions.
 */
export function useReservedRegions(
  kind?: ReservedRegionKind,
  options?: ReservedRegionOptions
): ReservedRegion[] {
  const regions = useSyncExternalStore(
    (onStoreChange) => {
      reservedRegionsListeners.add(onStoreChange)
      return () => {
        reservedRegionsListeners.delete(onStoreChange)
      }
    },
    () => currentReservedRegions,
    () => []
  )

  let filtered = regions
  if (kind) {
    filtered = filtered.filter((r) => r.kind === kind)
  }
  if (!options?.includeInactive) {
    filtered = filtered.filter((r) => r.isActive)
  }
  return filtered
}

export async function getReservedRegions(
  options?: ReservedRegionOptions
): Promise<ReservedRegion[]> {
  if (Platform.OS !== 'ios' || !NativeAdaptive?.getReservedRegions) {
    return []
  }
  return await NativeAdaptive.getReservedRegions(Boolean(options?.includeInactive))
}
