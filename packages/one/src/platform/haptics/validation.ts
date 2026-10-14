import type { AndroidHaptic, HapticImpact, HapticNotification } from './types'

// js-boundary validation shared by the web and native entries. unknown
// style/type strings throw here so invalid calls never reach native, whose
// spec takes them as enums.
export const IMPACT_STYLES: readonly HapticImpact[] = [
  'light',
  'medium',
  'heavy',
  'soft',
  'rigid',
]
export const NOTIFICATION_TYPES: readonly HapticNotification[] = [
  'success',
  'warning',
  'error',
]

export const ANDROID_HAPTICS: readonly AndroidHaptic[] = [
  'clock-tick',
  'confirm',
  'context-click',
  'drag-start',
  'gesture-end',
  'gesture-start',
  'keyboard-press',
  'keyboard-release',
  'keyboard-tap',
  'long-press',
  'no-haptics',
  'reject',
  'segment-frequent-tick',
  'segment-tick',
  'text-handle-move',
  'toggle-off',
  'toggle-on',
  'virtual-key',
  'virtual-key-release',
]

export function assertAndroidHaptic(type: AndroidHaptic): void {
  if (!ANDROID_HAPTICS.includes(type)) {
    throw new TypeError(
      `One.Haptics.performAndroidHaptics: unknown type ${JSON.stringify(type)}. Expected one of: ${ANDROID_HAPTICS.join(', ')}.`
    )
  }
}

export function assertImpact(style: HapticImpact): void {
  if (!IMPACT_STYLES.includes(style)) {
    throw new TypeError(
      `One.Haptics.impact: unknown style ${JSON.stringify(style)}. Expected one of: ${IMPACT_STYLES.join(', ')}.`
    )
  }
}

export function assertNotification(type: HapticNotification): void {
  if (!NOTIFICATION_TYPES.includes(type)) {
    throw new TypeError(
      `One.Haptics.notification: unknown type ${JSON.stringify(type)}. Expected one of: ${NOTIFICATION_TYPES.join(', ')}.`
    )
  }
}
