import type { HapticImpact, HapticNotification, Haptics as HapticsApi } from './types'
import { assertImpact, assertNotification } from './validation'

export type { HapticImpact, HapticNotification, HapticsApi }

// web entry. same shape as the native entry, including the JS-boundary
// validation throws, but every verb is a no-op: navigator.vibrate() cannot
// produce selection/impact/notification feedback, needs a user gesture, and
// is a no-op on ios safari and most desktops, so calling it would fake an
// affordance the platform cannot honor.
export const Haptics: HapticsApi = Object.freeze({
  selection() {},

  impact(style: HapticImpact) {
    assertImpact(style)
  },

  notification(type: HapticNotification) {
    assertNotification(type)
  },
})
