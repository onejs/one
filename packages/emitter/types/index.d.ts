export declare class Emitter<const T> {
    private disposables;
    listen: (disposable: (cb: T) => void) => () => void;
    emit: (next: T) => void;
    use: (cb: (cb: T) => void, args?: any[]) => void;
}
export declare function createEmitter<T>(): Emitter<T>;
//# sourceMappingURL=index.d.ts.map