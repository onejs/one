import { useSyncExternalStore } from 'react'
import { NitroModules } from 'react-native-nitro-modules'
import type { OneAdaptive } from '../specs/OneAdaptive.nitro'
import type { HingeState, SizeClass } from './types'
import * as ReservedRegions from './ReservedRegions.native'

export type * from './types'
export { ReservedRegions }

// the OneAdaptive nitro hybrid object, created once at import and cached.
// every binary carries the One pod, so a missing hybrid throws instead of
// falling back. live updates arrive through its callback listeners.
let hybrid: OneAdaptive | undefined

function native(): OneAdaptive {
  if (hybrid === undefined) {
    hybrid = NitroModules.createHybridObject<OneAdaptive>('OneAdaptive')
  }
  return hybrid
}

const DEFAULT_SIZE_CLASS: SizeClass = {
  horizontal: 'unspecified',
  vertical: 'unspecified',
}

// synchronous seed at import, mirroring safe-area initialWindowMetrics:
// the first render already measures real instead of flashing defaults.
let currentSizeClass: SizeClass = DEFAULT_SIZE_CLASS
let currentHinge: HingeState | null = null

function seedFromNative(): void {
  const created = native()
  currentSizeClass = created.getInitialSizeClass()
  currentHinge = created.getInitialHinge() ?? null
}

seedFromNative()

const sizeClassListeners = new Set<() => void>()
const hingeListeners = new Set<() => void>()

let sizeClassRemove: (() => void) | undefined
let hingeRemove: (() => void) | undefined
let hingeGeneration = 0

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
  if (sizeClassRemove === undefined) {
    // the first subscriber starts the native monitor; the newcomer also
    // gets the current value in case no change lands after subscribing.
    const created = native()
    sizeClassRemove = created.addSizeClassListener(setSizeClass)
    created.getSizeClass().then(setSizeClass)
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
  if (hingeRemove === undefined) {
    const created = native()
    const generation = ++hingeGeneration
    let sawEvent = false
    hingeRemove = created.addHingeListener((hinge) => {
      sawEvent = true
      setHinge(hinge ?? null)
    })
    created.getHinge().then((hinge) => {
      if (generation === hingeGeneration && !sawEvent) setHinge(hinge ?? null)
    })
  }
  return () => {
    hingeListeners.delete(onStoreChange)
    if (hingeListeners.size === 0) {
      hingeGeneration++
      hingeRemove?.()
      hingeRemove = undefined
      setHinge(null)
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
  return native().getSizeClass()
}

/**
 * Returns the current hardware hinge state (angle in radians and status).
 * null before the first interaction update, after observation stops, or when
 * the current view hierarchy has no hinge. Use size class and reserved
 * regions to choose layout.
 */
export function useHinge(): HingeState | null {
  return useSyncExternalStore(subscribeHinge, () => currentHinge, () => null)
}

export async function getHinge(): Promise<HingeState | null> {
  return (await native().getHinge()) ?? null
}

/**
 * Subscribes to hardware hinge changes.
 */
export function onHingeChange(callback: (hinge: HingeState | null) => void): () => void {
  const remove = native().addHingeListener((hinge) => callback(hinge ?? null))
  return () => remove()
}
