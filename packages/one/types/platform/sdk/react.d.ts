import { type SDKHandle, type SDKObservationKind } from './wire';
export type SDKState<T> = {
    status: 'pending';
    value: undefined;
    error: undefined;
} | {
    status: 'value';
    value: T;
    error: undefined;
} | {
    status: 'error';
    value: T | undefined;
    error: Error;
};
type Start<T> = (value: (value: T) => void, error: (error: Error) => void) => () => void;
export declare function createSDKStore<T>(start: Start<T>): {
    getSnapshot: () => SDKState<T>;
    subscribe(listener: () => void): () => void;
};
export declare function useSDKProperty<T extends SDKHandle, K extends keyof T & string>(object: T | null | undefined, property: K, kind?: SDKObservationKind): SDKState<Awaited<T[K]>>;
export declare function useSDKPublisher<T>(object: SDKHandle | null | undefined): SDKState<T>;
export declare function useSDKAsyncSequence<T>(object: SDKHandle | null | undefined): SDKState<T>;
export {};
//# sourceMappingURL=react.d.ts.map