import type { ProtectedStorePolicy } from '../specs/OneProtectedStore.nitro';
export type { ProtectedStorePolicy };
declare function createItem(key: string, value: string, policy: ProtectedStorePolicy): Promise<void>;
declare function getItem(key: string, reason: string, policy: ProtectedStorePolicy): Promise<string | null>;
declare function updateItem(key: string, value: string, reason: string, policy: ProtectedStorePolicy): Promise<void>;
declare function deleteItem(key: string, reason: string, policy: ProtectedStorePolicy): Promise<void>;
export declare const ProtectedStore: Readonly<{
    createItem: typeof createItem;
    getItem: typeof getItem;
    updateItem: typeof updateItem;
    deleteItem: typeof deleteItem;
}>;
//# sourceMappingURL=index.native.d.ts.map