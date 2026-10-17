import type { HybridObject, Sync } from 'react-native-nitro-modules'

// a native value javascript holds through the generated sdk bindings; the
// native value lives until javascript drops the handle
export interface OneSDKHandle extends HybridObject<{ ios: 'swift' }> {
  readonly typeName: string
}

export interface OneSDKResult {
  json: string
  handles: OneSDKHandle[]
}

// native code calls back into javascript through one dispatcher per call:
// `index` is the {"$f": index} the arguments named
export type OneSDKSyncDispatch = Sync<(index: number, json: string, handles: OneSDKHandle[]) => OneSDKResult>

export type OneSDKDispatch = (index: number, json: string, handles: OneSDKHandle[]) => void

// the one native surface every generated sdk binding calls. `id` numbers a
// symbol in the module's generated table; `json` carries {"self", "args"} in
// the wire format of packages/one/src/platform/sdk/wire.ts.
export interface OneSDK extends HybridObject<{ ios: 'swift' }> {
  call(module: string, id: number, json: string, handles: OneSDKHandle[], dispatch: OneSDKDispatch): OneSDKResult
  callSync(module: string, id: number, json: string, handles: OneSDKHandle[], dispatch: OneSDKDispatch, syncDispatch: OneSDKSyncDispatch): OneSDKResult
  callFunction(handle: OneSDKHandle, json: string, handles: OneSDKHandle[], dispatch: OneSDKDispatch): Promise<OneSDKResult>
  callAsync(
    module: string,
    id: number,
    json: string,
    handles: OneSDKHandle[],
    dispatch: OneSDKDispatch
  ): Promise<OneSDKResult>
}
