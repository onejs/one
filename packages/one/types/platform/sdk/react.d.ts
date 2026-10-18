import { type SDKHandle, type SDKSequence } from './wire';
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
export type SDKObservableKey<T extends SDKHandle> = keyof T['$observable'] & keyof T & string;
export type SDKElement<S> = S extends SDKSequence<infer T> ? T : unknown;
export declare function useSDKProperty<T extends SDKHandle, K extends SDKObservableKey<T>>(object: T | null | undefined, property: K): SDKState<Awaited<T[K]>>;
export declare function useSDKSequence<T>(sequence: SDKSequence<T> | null | undefined): SDKState<T>;
export declare function useSDKSequence(sequence: SDKHandle | null | undefined): SDKState<unknown>;
export {};
