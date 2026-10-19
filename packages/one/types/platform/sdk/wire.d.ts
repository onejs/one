import type { OneSDK, OneSDKHandle, OneSDKValue } from '../specs/OneSDK.nitro';
export type { OneSDKHandle, OneSDKPoint, OneSDKRect, OneSDKResult, OneSDKValue } from '../specs/OneSDK.nitro';
export type SDKNative = Pick<OneSDK, 'call' | 'callSync' | 'callAsync' | 'callFunction' | 'observe' | 'subscribe'>;
export type Implements<P> = Partial<P>;
export type NativeOut<T> = {
    value: T;
};
export type NativeError = SDKHandle & {
    readonly message?: string;
};
export type NativeMap<K, V> = Map<K, V>;
export type Handle<_Name = string, _Args = unknown> = SDKHandle;
export declare class SDKHandle {
    readonly $handle: OneSDKHandle;
    readonly $identity: string | OneSDKHandle;
    readonly $observable: {};
    constructor($handle: OneSDKHandle, $identity?: string | OneSDKHandle);
}
export type SDKSequence<T> = SDKHandle & {
    readonly $element: T;
};
type Wrapper = new (handle: OneSDKHandle, identity?: string) => SDKHandle;
type Method = {
    id: number;
    args?: (number | null)[];
    hints?: (WireHint | null)[];
};
type PropertyTable = {
    module: string;
    properties: Record<string, number>;
};
type ClassTable = PropertyTable & {
    methods?: Record<string, Method>;
};
export declare function setSDKNative(native: SDKNative | (() => SDKNative)): void;
export declare function registerSDKClass(swiftName: string, wrapper: Wrapper, properties?: ClassTable, extension?: boolean): void;
export declare function registerSDKProtocol(usr: string, methods: Record<string, string>): void;
export type WireHint = {
    protocol?: string;
    array?: WireHint;
    dictionary?: WireHint;
    fields?: Record<string, WireHint>;
    callback?: {
        out: number[];
    };
};
export declare function decodeSDKResult<T = unknown>(result: OneSDKValue): T;
export declare function callSDK<T>(module: string, id: number, receiver: unknown, args: unknown[], hints?: (WireHint | null)[], syncCallbacks?: boolean): T;
type MethodKey<T> = {
    [K in keyof T]-?: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T] & string;
type MethodFunction<T, K extends keyof T> = Extract<T[K], (...args: any[]) => any>;
export declare function callSDKMethodAsync<T extends SDKHandle, K extends MethodKey<T>>(object: T, method: K, ...args: Parameters<MethodFunction<T, K>>): Promise<Awaited<ReturnType<MethodFunction<T, K>>>>;
export declare function callSDKAsync<T>(module: string, id: number, receiver: unknown, args: unknown[], hints?: (WireHint | null)[]): Promise<T>;
export declare function observeSDKProperty<T>(object: SDKHandle, property: string, value: (value: T) => void, error: (error: Error) => void): () => void;
export declare function subscribeSDK<T>(object: SDKHandle, value: (value: T) => void, error: (error: Error) => void): () => void;
export { useSDKProperty, useSDKSequence } from './react';
export type { SDKState, SDKObservableKey, SDKElement } from './react';
//# sourceMappingURL=wire.d.ts.map