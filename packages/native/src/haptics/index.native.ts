import { TurboModuleRegistry } from 'react-native'
import type { TurboModule } from 'react-native'
import type { HapticImpact, HapticNotification, Haptics as HapticsApi } from './types'
import { assertImpact, assertNotification } from './validation'

export type { HapticImpact, HapticNotification, HapticsApi }

// the OneNativeHaptics legacy module shape, which TurboModuleRegistry.get
// falls back to. methods are required: a resolved module always has them.
interface HapticsSpec extends TurboModule {
  selection(): void
  impact(style: HapticImpact): void
  notification(type: HapticNotification): void
}

// resolved once and cached at module scope. get returns null on an old
// build (or any bundle without the native side), where every verb below
// degrades to a silent no-op; it never throws for a missing module, so no
// try/catch. lazy so the lookup runs after the bridge exists.
let cachedModule: HapticsSpec | null | undefined

function nativeModule(): HapticsSpec | null {
  if (cachedModule === undefined) {
    cachedModule = TurboModuleRegistry.get<HapticsSpec>('OneNativeHaptics')
  }
  return cachedModule
}

// fire-and-forget: haptics have no meaningful completion, so awaiting them
// would only serialize feedback behind bridge latency. unknown style/type
// strings throw at this JS boundary; the native side no-ops defensively.
export const Haptics: HapticsApi = Object.freeze({
  selection() {
    nativeModule()?.selection()
  },

  impact(style: HapticImpact) {
    assertImpact(style)
    nativeModule()?.impact(style)
  },

  notification(type: HapticNotification) {
    assertNotification(type)
    nativeModule()?.notification(type)
  },
})
