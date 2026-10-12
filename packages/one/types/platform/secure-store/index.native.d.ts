declare function getItem(key: string): Promise<string | null>;
declare function setItem(key: string, value: string): Promise<void>;
declare function deleteItem(key: string): Promise<void>;
declare function getItemSync(key: string): string | null;
declare function setItemSync(key: string, value: string): void;
declare function deleteItemSync(key: string): void;
export declare const SecureStore: Readonly<{
    getItem: typeof getItem;
    setItem: typeof setItem;
    deleteItem: typeof deleteItem;
    getItemSync: typeof getItemSync;
    setItemSync: typeof setItemSync;
    deleteItemSync: typeof deleteItemSync;
}>;
export {};
//# sourceMappingURL=index.native.d.ts.map