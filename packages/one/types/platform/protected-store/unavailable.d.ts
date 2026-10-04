import type { ProtectedStorePolicy } from '../specs/OneProtectedStore.nitro';
export type { ProtectedStorePolicy };
export declare const ProtectedStore: Readonly<{
    createItem: (_key: string, _value: string, _policy: ProtectedStorePolicy) => Promise<void>;
    getItem: (_key: string, _reason: string, _policy: ProtectedStorePolicy) => Promise<string | null>;
    updateItem: (_key: string, _value: string, _reason: string, _policy: ProtectedStorePolicy) => Promise<void>;
    deleteItem: (_key: string, _reason: string, _policy: ProtectedStorePolicy) => Promise<void>;
}>;
//# sourceMappingURL=unavailable.d.ts.map