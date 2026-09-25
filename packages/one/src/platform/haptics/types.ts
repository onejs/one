// haptic vocabulary. the method names are Apple's (UISelectionFeedbackGenerator,
// UIImpactFeedbackGenerator.FeedbackStyle, UINotificationFeedbackGenerator.FeedbackType),
// which is why they match expo-haptics without being copied from it.

export type HapticImpact = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid'
export type HapticNotification = 'success' | 'warning' | 'error'

export interface Haptics {
  /** picking among options, toggles, segments, mode switches */
  selection(): void
  /** physical commits, drops, hard snaps, drag thresholds */
  impact(style: HapticImpact): void
  /** completion and failure the user cares about */
  notification(type: HapticNotification): void
}
