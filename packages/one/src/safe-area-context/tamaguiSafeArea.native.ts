import type { EdgeInsets, Metrics, Rect } from './SafeArea-types'

// tamagui resolves `safe` style values and the safe-area-* variables on native
// from one global that @tamagui/native/setup-safe-area fills from
// react-native-safe-area-context. one owns the safe area, so its root provider
// fills that global itself and a one app needs no setup import. the keys and
// the state shape are createGlobalState('safe_area') and
// createGlobalState('safe_area_subscriptions') in @tamagui/native, which reads
// them lazily, so whichever side runs first creates the shared object.
type TamaguiSafeAreaState = {
  didSetup: boolean
  enabled: boolean
  useSafeAreaInsets: (() => EdgeInsets) | null
  useSafeAreaFrame: (() => Rect) | null
  initialMetrics: Metrics | null
}

type TamaguiSafeAreaGlobal = typeof globalThis & {
  __tamagui_safe_area__?: TamaguiSafeAreaState
  __tamagui_safe_area_subscriptions__?: { enabled: boolean; listeners: Set<() => void> }
}

export function feedTamaguiSafeArea(
  metrics: Metrics | null,
  hooks: { useSafeAreaInsets: () => EdgeInsets; useSafeAreaFrame: () => Rect }
): void {
  const g = globalThis as TamaguiSafeAreaGlobal
  const state = (g.__tamagui_safe_area__ ??= {
    didSetup: false,
    enabled: false,
    useSafeAreaInsets: null,
    useSafeAreaFrame: null,
    initialMetrics: null,
  })
  const previous = state.initialMetrics
  state.didSetup = true
  state.enabled = true
  state.useSafeAreaInsets ??= hooks.useSafeAreaInsets
  state.useSafeAreaFrame ??= hooks.useSafeAreaFrame
  if (!metrics || (previous && sameMetrics(previous, metrics))) return
  state.initialMetrics = metrics
  g.__tamagui_safe_area_subscriptions__?.listeners.forEach((listener) => listener())
}

function sameMetrics(a: Metrics, b: Metrics): boolean {
  return (
    a.insets.top === b.insets.top &&
    a.insets.right === b.insets.right &&
    a.insets.bottom === b.insets.bottom &&
    a.insets.left === b.insets.left &&
    a.frame.x === b.frame.x &&
    a.frame.y === b.frame.y &&
    a.frame.width === b.frame.width &&
    a.frame.height === b.frame.height
  )
}
