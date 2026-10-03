import type { HybridObject } from 'react-native-nitro-modules';
export type ProtectedStorePolicy = 'userPresence' | 'biometryCurrentSet';
export interface OneProtectedStore extends HybridObject<{
    ios: 'swift';
}> {
    createItem(key: string, value: string, policy: ProtectedStorePolicy): Promise<void>;
    getItem(key: string, reason: string, policy: ProtectedStorePolicy): Promise<string | undefined>;
    updateItem(key: string, value: string, reason: string, policy: ProtectedStorePolicy): Promise<void>;
    deleteItem(key: string, reason: string, policy: ProtectedStorePolicy): Promise<void>;
}
//# sourceMappingURL=OneProtectedStore.nitro.d.ts.map