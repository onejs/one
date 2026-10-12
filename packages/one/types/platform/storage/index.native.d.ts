declare function getItem(key: string): string | null;
declare function setItem(key: string, value: string): void;
declare function removeItem(key: string): void;
declare function getAllKeys(): string[];
export declare const Storage: Readonly<{
    getItem: typeof getItem;
    setItem: typeof setItem;
    removeItem: typeof removeItem;
    getAllKeys: typeof getAllKeys;
}>;
export {};
//# sourceMappingURL=index.native.d.ts.map