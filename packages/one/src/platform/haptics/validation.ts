import type { HapticImpact, HapticNotification } from './types'

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
