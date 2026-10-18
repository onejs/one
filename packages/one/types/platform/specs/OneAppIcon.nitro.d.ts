import type { HybridObject } from 'react-native-nitro-modules';
export interface OneAppIcon extends HybridObject<{
    android: 'kotlin';
}> {
    isSupported(): Promise<boolean>;
    getCurrentName(): Promise<string | undefined>;
    setIcon(name?: string): Promise<void>;
}
//# sourceMappingURL=OneAppIcon.nitro.d.ts.map