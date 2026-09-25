export type NativeSyncHost<T> = {
    readonly id: number;
    get(): T;
    set(value: T): void;
    setOnChange(listener: ((value: T) => void) | null): void;
    release(): void;
};
export type NativeSyncFactory = {
    create<T>(initial: T): NativeSyncHost<T>;
};
export declare function getNativeSyncFactory(): NativeSyncFactory;
//# sourceMappingURL=syncNative.d.ts.map