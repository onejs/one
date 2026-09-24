import type { HybridObject } from 'react-native-nitro-modules';
export interface OneFonts extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    load(name: string, uri: string): Promise<void>;
    isLoaded(name: string): boolean;
}
//# sourceMappingURL=OneFonts.nitro.d.ts.map