export declare class Emitter<T> {
    private disposables;
    listen: (disposable: (cb: T) => void) => () => void;
    emit: <T_1>(next: T_1) => void;
    use: (cb: (cb: T) => void, args?: any[]) => void;
}
export declare function createEmitter<T>(): Emitter<T>;
//# sourceMappingURL=index.d.ts.map