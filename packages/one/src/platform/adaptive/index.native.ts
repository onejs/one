import { useSyncExternalStore } from 'react'
import { NitroModules } from 'react-native-nitro-modules'
import type { OneAdaptive } from '../specs/OneAdaptive.nitro'
import type { HingeState, SizeClass } from './types'
import * as ReservedRegions from './ReservedRegions.native'

export type * from './types'
export { ReservedRegions }

// the OneAdaptive nitro hybrid object, created on first use and cached.
// live updates arrive through its callback listeners, never the bridge.
// runtimes without the hybrid (older binaries, compat sims) fall back to the
// defaults below instead of throwing, matching the legacy module contract.
let hybrid: OneAdaptive | null | undefined

function native(): OneAdaptive | undefined {
  if (hybrid === undefined) {
    try {
      hybrid = NitroModules.createHybridObject<OneAdaptive>('OneAdaptive')
    } catch {
      hybrid = null
    }
  }
  return hybrid ?? undefined
}

const DEFAULT_SIZE_CLASS: SizeClass = {
  horizontal: 'unspecified',
  vertical: 'unspecified',
}

let currentSizeClass: SizeClass = DEFAULT_SIZE_CLASS
let currentHinge: HingeState | null = null

const sizeClassListeners = new Set<() => void>()
const hingeListeners = new Set<() => void>()

let sizeClassRemove: (() => void) | undefined
let hingeRemove: (() => void) | undefined

function sizesEqual(a: SizeClass, b: SizeClass): boolean {
  return a.horizontal === b.horizontal && a.vertical === b.vertical
}

function hingesEqual(a: HingeState | null, b: HingeState | null): boolean {
  return (
    a === b ||
    (a != null &&
      b != null &&
      a.status === b.status &&
      a.angle === b.angle)
  )
}

function setSizeClass(next: SizeClass) {
  if (sizesEqual(currentSizeClass, next)) return
  currentSizeClass = next
  sizeClassListeners.forEach((listener) => listener())
}

function setHinge(next: HingeState | null) {
  if (hingesEqual(currentHinge, next)) return
  currentHinge = next
  hingeListeners.forEach((listener) => listener())
}

function subscribeSizeClass(onStoreChange: () => void): () => void {
  sizeClassListeners.add(onStoreChange)
  const hybrid = native()
  if (sizeClassRemove === undefined && hybrid !== undefined) {
    // the first subscriber starts the native monitor; the newcomer also
    // gets the current value in case no change lands after subscribing.
    sizeClassRemove = hybrid.addSizeClassListener(setSizeClass)
    hybrid.getSizeClass().then(setSizeClass, () => {})
  }
  return () => {
    sizeClassListeners.delete(onStoreChange)
    if (sizeClassListeners.size === 0) {
      sizeClassRemove?.()
      sizeClassRemove = undefined
    }
  }
}

function subscribeHinge(onStoreChange: () => void): () => void {
  hingeListeners.add(onStoreChange)
  const hybrid = native()
  if (hingeRemove === undefined && hybrid !== undefined) {
    hingeRemove = hybrid.addHingeListener((hinge) => setHinge(hinge ?? null))
    hybrid.getHinge().then((hinge) => setHinge(hinge ?? null), () => {})
  }
  return () => {
    hingeListeners.delete(onStoreChange)
    if (hingeListeners.size === 0) {
      hingeRemove?.()
      hingeRemove = undefined
    }
  }
}

/**
 * Returns the window's horizontal and vertical size class as live React state.
 * iOS reads the window scene's UIUserInterfaceSizeClass with live
 * trait-change updates; Android maps the activity window's WindowMetrics
 * (compact below 600dp wide / 480dp tall, else regular) and updates on
 * configuration and window-metrics changes.
 */
export function useSizeClass(): SizeClass {
  return useSyncExternalStore(subscribeSizeClass, () => currentSizeClass, () => DEFAULT_SIZE_CLASS)
}

export function getSizeClass(): Promise<SizeClass> {
  return native()?.getSizeClass() ?? Promise.resolve(DEFAULT_SIZE_CLASS)
}

/**
 * Returns the current hardware hinge state (angle in radians and status).
 * Null when the device has no hinge.
 */
export function useHinge(): HingeState | null {
  return useSyncExternalStore(subscribeHinge, () => currentHinge, () => null)
}

export async function getHinge(): Promise<HingeState | null> {
  return (await native()?.getHinge()) ?? null
}

/**
 * Subscribes to hardware hinge changes.
 */
export function onHingeChange(callback: (hinge: HingeState | null) => void): () => void {
  const remove = native()?.addHingeListener((hinge) => callback(hinge ?? null))
  return () => remove?.()
}
