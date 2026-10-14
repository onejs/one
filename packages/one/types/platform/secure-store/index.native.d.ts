import type { SecureStoreOptions } from './types';
export type { SecureStoreAccessibility, SecureStoreOptions } from './types';
declare function getItem(key: string, options?: SecureStoreOptions): Promise<string | null>;
declare function setItem(key: string, value: string, options?: SecureStoreOptions): Promise<void>;
declare function deleteItem(key: string, options?: SecureStoreOptions): Promise<void>;
declare function getItemSync(key: string, options?: SecureStoreOptions): string | null;
declare function setItemSync(key: string, value: string, options?: SecureStoreOptions): void;
declare function deleteItemSync(key: string, options?: SecureStoreOptions): void;
export declare const SecureStore: Readonly<{
    getItem: typeof getItem;
    setItem: typeof setItem;
    deleteItem: typeof deleteItem;
    getItemSync: typeof getItemSync;
    setItemSync: typeof setItemSync;
    deleteItemSync: typeof deleteItemSync;
}>;
//# sourceMappingURL=index.native.d.ts.map