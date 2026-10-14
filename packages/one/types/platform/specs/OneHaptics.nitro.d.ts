import type { HybridObject } from 'react-native-nitro-modules';
import type { AndroidHaptic, HapticImpact, HapticNotification } from '../haptics/types';
export interface OneHaptics extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    selection(): void;
    impact(style: HapticImpact): void;
    notification(type: HapticNotification): void;
    performAndroidHaptics(type: AndroidHaptic): void;
}
//# sourceMappingURL=OneHaptics.nitro.d.ts.map