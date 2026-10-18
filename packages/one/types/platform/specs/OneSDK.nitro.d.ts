import type { AnyMap, HybridObject, Sync } from 'react-native-nitro-modules';
export interface OneSDKHandle extends HybridObject<{
    ios: 'swift';
}> {
    readonly typeName: string;
}
export interface OneSDKResult {
    data: AnyMap;
    handles: OneSDKHandle[];
}
export type OneSDKSyncDispatch = Sync<(index: number, data: AnyMap, handles: OneSDKHandle[]) => OneSDKResult>;
export type OneSDKDispatch = (index: number, data: AnyMap, handles: OneSDKHandle[]) => void;
export interface OneSDK extends HybridObject<{
    ios: 'swift';
}> {
    observe(module: string, id: number, data: AnyMap, handles: OneSDKHandle[], kind: string, listener: (result: OneSDKResult) => void): () => void;
    subscribe(handle: OneSDKHandle, kind: string, listener: (result: OneSDKResult) => void): () => void;
    call(module: string, id: number, data: AnyMap, handles: OneSDKHandle[], dispatch: OneSDKDispatch): OneSDKResult;
    callSync(module: string, id: number, data: AnyMap, handles: OneSDKHandle[], dispatch: OneSDKDispatch, syncDispatch: OneSDKSyncDispatch): OneSDKResult;
    callFunction(handle: OneSDKHandle, data: AnyMap, handles: OneSDKHandle[], dispatch: OneSDKDispatch): Promise<OneSDKResult>;
    callAsync(module: string, id: number, data: AnyMap, handles: OneSDKHandle[], dispatch: OneSDKDispatch): Promise<OneSDKResult>;
}
//# sourceMappingURL=OneSDK.nitro.d.ts.map