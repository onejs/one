import type { HybridObject } from 'react-native-nitro-modules'
import type { AndroidHaptic, HapticImpact, HapticNotification } from '../haptics/types'

// fire-and-forget tactile feedback behind One.Haptics. sync void calls:
// gesture handlers fire these at threshold rates, so nothing is awaited.
export interface OneHaptics extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  selection(): void
  impact(style: HapticImpact): void
  notification(type: HapticNotification): void
  // android performs the HapticFeedbackConstants feedback; ios is a no-op,
  // matching expo-haptics performAndroidHapticsAsync off android.
  performAndroidHaptics(type: AndroidHaptic): void
}
