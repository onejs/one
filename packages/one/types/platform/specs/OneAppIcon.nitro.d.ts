import type { HybridObject } from 'react-native-nitro-modules';
export interface OneAppIcon extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    isSupported(): Promise<boolean>;
    getCurrentName(): Promise<string | undefined>;
    setIcon(name?: string): Promise<void>;
}
//# sourceMappingURL=OneAppIcon.nitro.d.ts.map