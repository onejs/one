import type { HybridObject } from 'react-native-nitro-modules';
export interface OneStorage extends HybridObject<{
    ios: 'c++';
    android: 'c++';
}> {
    getItem(key: string): string | undefined;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    getAllKeys(): string[];
}
//# sourceMappingURL=OneStorage.nitro.d.ts.map