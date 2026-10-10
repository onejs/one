export type DatabaseKeyValue = Readonly<{
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    getAllKeys(): string[];
    clear(): void;
    close(): void;
}>;
export declare function requireName(name: unknown): string;
export declare function requireKey(verb: string, key: unknown): string;
export declare function requireValue(verb: string, value: unknown): string;
export declare function assertOpen(verb: string, closed: boolean): void;
//# sourceMappingURL=keyValueValidate.d.ts.map