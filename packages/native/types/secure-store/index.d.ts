declare function getItem(key: string): Promise<string | null>;
declare function setItem(key: string, value: string): Promise<void>;
declare function deleteItem(key: string): Promise<void>;
export declare const SecureStore: Readonly<{
    getItem: typeof getItem;
    setItem: typeof setItem;
    deleteItem: typeof deleteItem;
}>;
export {};
//# sourceMappingURL=index.d.ts.map