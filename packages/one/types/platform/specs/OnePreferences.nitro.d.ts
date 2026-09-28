import type { HybridObject } from 'react-native-nitro-modules';
export interface OnePreferences extends HybridObject<{
    ios: 'swift';
}> {
    getItem(key: string): Promise<string | undefined>;
    setItem(key: string, value: string): Promise<void>;
    deleteItem(key: string): Promise<void>;
    getItemSync(key: string): string | undefined;
    setItemSync(key: string, value: string): void;
    deleteItemSync(key: string): void;
}
//# sourceMappingURL=OnePreferences.nitro.d.ts.map