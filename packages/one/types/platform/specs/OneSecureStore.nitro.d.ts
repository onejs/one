import type { HybridObject } from 'react-native-nitro-modules';
export interface OneSecureStore extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getItem(key: string): Promise<string | undefined>;
    setItem(key: string, value: string): Promise<void>;
    deleteItem(key: string): Promise<void>;
}
//# sourceMappingURL=OneSecureStore.nitro.d.ts.map