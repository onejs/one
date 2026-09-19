export type NativeState<T> = {
    readonly value: T;
    set(value: T | ((previous: T) => T)): void;
    get(): T;
};
export declare function useNativeState<T>(initial: T): NativeState<T>;
//# sourceMappingURL=nativeState.d.ts.map