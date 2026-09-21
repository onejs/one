import type { HapticImpact, HapticNotification, Haptics as HapticsApi } from './types'

export type { HapticImpact, HapticNotification, HapticsApi }
export {
  errorConstantForSdk,
  selectionConstantForSdk,
  successConstantForSdk,
} from './mapping'

// web entry. same shape as the native entry, including the JS-boundary
// validation throws, but every verb is a no-op: navigator.vibrate() cannot
// produce selection/impact/notification feedback, needs a user gesture, and
// is a no-op on ios safari and most desktops, so calling it would fake an
// affordance the platform cannot honor.
export function isHapticsAvailable(): boolean {
  return false
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

export const Haptics: HapticsApi = Object.freeze({
  selection() {},

  impact(style: HapticImpact) {
    assertImpact(style)
  },

  notification(type: HapticNotification) {
    assertNotification(type)
  },
})
