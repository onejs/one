import type { HybridObject } from 'react-native-nitro-modules';
import type { SecureStoreOptions } from '../secure-store/types';
export type { SecureStoreOptions };
export interface OneSecureStore extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getItem(key: string, options: SecureStoreOptions): Promise<string | undefined>;
    setItem(key: string, value: string, options: SecureStoreOptions): Promise<void>;
    deleteItem(key: string, options: SecureStoreOptions): Promise<void>;
    getItemSync(key: string, options: SecureStoreOptions): string | undefined;
    setItemSync(key: string, value: string, options: SecureStoreOptions): void;
    deleteItemSync(key: string, options: SecureStoreOptions): void;
}
//# sourceMappingURL=OneSecureStore.nitro.d.ts.map