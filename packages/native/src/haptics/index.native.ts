import { TurboModuleRegistry } from 'react-native'
import type { HapticImpact, HapticNotification, Haptics as HapticsApi } from './types'

export type { HapticImpact, HapticNotification, HapticsApi }
export {
  errorConstantForSdk,
  selectionConstantForSdk,
  successConstantForSdk,
} from './mapping'

type NativeHapticsModule = {
  selection?: () => void
  impact?: (style: HapticImpact) => void
  notification?: (type: HapticNotification) => void
} | null

// the OneNativeHaptics legacy module, which TurboModuleRegistry.get falls
// back to. null on an old build (or any bundle without the native side),
// where every verb below degrades to a silent no-op.
function nativeModule(): NativeHapticsModule {
  try {
    return TurboModuleRegistry.get('OneNativeHaptics') as NativeHapticsModule
  } catch {
    return null
  }
}

export function isHapticsAvailable(): boolean {
  return nativeModule() !== null
}

const IMPACT_STYLES: readonly HapticImpact[] = ['light', 'medium', 'heavy', 'soft', 'rigid']
const NOTIFICATION_TYPES: readonly HapticNotification[] = ['success', 'warning', 'error']

function assertImpact(style: HapticImpact): void {
  if (!IMPACT_STYLES.includes(style)) {
    throw new TypeError(
      `One.UI.Haptics.impact: unknown style ${JSON.stringify(style)}. Expected one of: ${IMPACT_STYLES.join(', ')}.`
    )
  }
}

function assertNotification(type: HapticNotification): void {
  if (!NOTIFICATION_TYPES.includes(type)) {
    throw new TypeError(
      `One.UI.Haptics.notification: unknown type ${JSON.stringify(type)}. Expected one of: ${NOTIFICATION_TYPES.join(', ')}.`
    )
  }
}

// fire-and-forget: haptics have no meaningful completion, so awaiting them
// would only serialize feedback behind bridge latency. unknown style/type
// strings throw at this JS boundary; the native side no-ops defensively.
export const Haptics: HapticsApi = Object.freeze({
  selection() {
    nativeModule()?.selection?.()
  },

  impact(style: HapticImpact) {
    assertImpact(style)
    nativeModule()?.impact?.(style)
  },

  notification(type: HapticNotification) {
    assertNotification(type)
    nativeModule()?.notification?.(type)
  },
})
