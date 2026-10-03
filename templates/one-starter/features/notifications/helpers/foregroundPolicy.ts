import type {
  NotificationForegroundPolicy,
  NotificationForegroundPresentation,
} from './types'

// `system` keeps the platform's own foreground presentation, which is what an
// app gets when it says nothing about presentation at all.
export const DEFAULT_FOREGROUND_POLICY: NotificationForegroundPolicy = 'system'

const SYSTEM_PRESENTATION: NotificationForegroundPresentation = {
  shouldShowBanner: true,
  shouldShowList: true,
  shouldPlaySound: true,
  shouldSetBadge: false,
}

const SUPPRESSED_PRESENTATION: NotificationForegroundPresentation = {
  shouldShowBanner: false,
  shouldShowList: false,
  shouldPlaySound: false,
  shouldSetBadge: false,
}

// the operating-system presentation for a foreground notification under the
// given policy. `inApp` and `none` both suppress it, so the product owns the
// only transient presentation the user can see.
export function systemForegroundPresentation(
  policy: NotificationForegroundPolicy,
): NotificationForegroundPresentation {
  return policy === 'system' ? SYSTEM_PRESENTATION : SUPPRESSED_PRESENTATION
}

// whether the product presents the event itself while the app is foregrounded.
// at most one of this and `systemForegroundPresentation` presents anything.
export function presentsInAppNotification(policy: NotificationForegroundPolicy): boolean {
  return policy === 'inApp'
}
