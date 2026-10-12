import type { HybridObject } from 'react-native-nitro-modules';
export interface OneLaunchScreen extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    preventAutoHide(): void;
    hide(fade: boolean): void;
}
//# sourceMappingURL=OneLaunchScreen.nitro.d.ts.map