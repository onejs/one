import type { AnyMap, HybridObject, Sync } from 'react-native-nitro-modules'

// a native value javascript holds through the generated sdk bindings; the
// native value lives until javascript drops the handle
export interface OneSDKHandle extends HybridObject<{ ios: 'swift' }> {
  readonly typeName: string
}

export interface OneSDKResult {
  data: AnyMap
  handles: OneSDKHandle[]
}

// native code calls back into javascript through one dispatcher per call:
// `index` is the {"$f": index} the arguments named
export type OneSDKSyncDispatch = Sync<(index: number, data: AnyMap, handles: OneSDKHandle[]) => OneSDKResult>

export type OneSDKDispatch = (index: number, data: AnyMap, handles: OneSDKHandle[]) => void

// the one native surface every generated sdk binding calls. `id` numbers a
// symbol in the module's generated table; `data` carries {"self", "args"} in
// the value format of packages/one/src/platform/sdk/wire.ts.
export interface OneSDK extends HybridObject<{ ios: 'swift' }> {
  // the generated table observes a property by key-value observing or observation tracking
  observe(module: string, id: number, data: AnyMap, handles: OneSDKHandle[], listener: (result: OneSDKResult) => void): () => void
  // follows a handle holding a Combine publisher or an AsyncSequence
  subscribe(handle: OneSDKHandle, listener: (result: OneSDKResult) => void): () => void
  call(module: string, id: number, data: AnyMap, handles: OneSDKHandle[], dispatch: OneSDKDispatch): OneSDKResult
  callSync(module: string, id: number, data: AnyMap, handles: OneSDKHandle[], dispatch: OneSDKDispatch, syncDispatch: OneSDKSyncDispatch): OneSDKResult
  callFunction(handle: OneSDKHandle, data: AnyMap, handles: OneSDKHandle[], dispatch: OneSDKDispatch): Promise<OneSDKResult>
  callAsync(
    module: string,
    id: number,
    data: AnyMap,
    handles: OneSDKHandle[],
    dispatch: OneSDKDispatch
  ): Promise<OneSDKResult>
}
