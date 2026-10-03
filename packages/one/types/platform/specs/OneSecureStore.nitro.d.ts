import type { HybridObject } from 'react-native-nitro-modules';
export interface OneSecureStore extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getItem(key: string): Promise<string | undefined>;
    setItem(key: string, value: string): Promise<void>;
    deleteItem(key: string): Promise<void>;
    getItemSync(key: string): string | undefined;
    setItemSync(key: string, value: string): void;
    deleteItemSync(key: string): void;
}
//# sourceMappingURL=OneSecureStore.nitro.d.ts.map