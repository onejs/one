import type { AnyMap, HybridObject, Sync } from 'react-native-nitro-modules';
export interface OneSDKHandle extends HybridObject<{
    ios: 'swift';
}> {
    readonly typeName: string;
    readonly identity?: string;
    readonly superclasses?: string[];
    readonly callable?: boolean;
}
export interface OneSDKRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface OneSDKPoint {
    x: number;
    y: number;
}
export interface OneSDKResult {
    data: AnyMap;
    handles: OneSDKHandle[];
    buffers?: ArrayBuffer[];
}
export type OneSDKValue = null | boolean | number | string | ArrayBuffer | Date | OneSDKHandle | OneSDKRect | OneSDKPoint | OneSDKResult;
export type OneSDKSyncDispatch = Sync<(index: number, data: AnyMap, handles: OneSDKHandle[], buffers: ArrayBuffer[]) => OneSDKResult>;
export type OneSDKDispatch = (index: number, data: AnyMap, handles: OneSDKHandle[], buffers: ArrayBuffer[]) => void;
export interface OneSDK extends HybridObject<{
    ios: 'swift';
}> {
    observe(module: string, id: number, data: AnyMap, handles: OneSDKHandle[], listener: (result: OneSDKResult) => void): () => void;
    subscribe(handle: OneSDKHandle, listener: (result: OneSDKResult) => void): () => void;
    call(module: string, id: number, receiver: OneSDKValue, arg0: OneSDKValue, arg1: OneSDKValue, dispatch?: OneSDKDispatch): OneSDKValue;
    callSync(module: string, id: number, data: OneSDKResult, dispatch: OneSDKDispatch, syncDispatch: OneSDKSyncDispatch): OneSDKValue;
    callFunction(handle: OneSDKHandle, arg0: OneSDKValue, arg1: OneSDKValue, dispatch?: OneSDKDispatch): Promise<OneSDKValue>;
    callAsync(module: string, id: number, receiver: OneSDKValue, arg0: OneSDKValue, arg1: OneSDKValue, dispatch?: OneSDKDispatch): Promise<OneSDKValue>;
}
//# sourceMappingURL=OneSDK.nitro.d.ts.map