// haptic vocabulary. the method names are Apple's (UISelectionFeedbackGenerator,
// UIImpactFeedbackGenerator.FeedbackStyle, UINotificationFeedbackGenerator.FeedbackType),
// which is why they match expo-haptics without being copied from it.

export type HapticImpact = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid'
export type HapticNotification = 'success' | 'warning' | 'error'

// expo-haptics AndroidHaptics values: android.view.HapticFeedbackConstants
// names as lowercase strings. android only; a no-op elsewhere, as in expo.
export type AndroidHaptic =
  | 'clock-tick'
  | 'confirm'
  | 'context-click'
  | 'drag-start'
  | 'gesture-end'
  | 'gesture-start'
  | 'keyboard-press'
  | 'keyboard-release'
  | 'keyboard-tap'
  | 'long-press'
  | 'no-haptics'
  | 'reject'
  | 'segment-frequent-tick'
  | 'segment-tick'
  | 'text-handle-move'
  | 'toggle-off'
  | 'toggle-on'
  | 'virtual-key'
  | 'virtual-key-release'

export interface Haptics {
  /** picking among options, toggles, segments, mode switches */
  selection(): void
  /** physical commits, drops, hard snaps, drag thresholds */
  impact(style: HapticImpact): void
  /** completion and failure the user cares about */
  notification(type: HapticNotification): void
  /** android HapticFeedbackConstants feedback; no-op on ios and web */
  performAndroidHaptics(type: AndroidHaptic): void
}
