import type { AnyMap, HybridObject, Sync } from 'react-native-nitro-modules'

// a native value javascript holds through the generated sdk bindings; the
// native value lives until javascript drops the handle
export interface OneSDKHandle extends HybridObject<{ ios: 'swift' }> {
  readonly typeName: string
  readonly identity?: string
  readonly superclasses?: string[]
  readonly callable?: boolean
}

export interface OneSDKRect {
  x: number
  y: number
  width: number
  height: number
}

export interface OneSDKPoint {
  x: number
  y: number
}

export interface OneSDKResult {
  data: AnyMap
  handles: OneSDKHandle[]
  buffers?: ArrayBuffer[]
}

export type OneSDKValue =
  | null
  | boolean
  | number
  | string
  | ArrayBuffer
  | Date
  | OneSDKHandle
  | OneSDKRect
  | OneSDKPoint
  | OneSDKResult

// native code calls back into javascript through one dispatcher per call:
// `index` is the {"$f": index} the arguments named
export type OneSDKSyncDispatch = Sync<(index: number, data: AnyMap, handles: OneSDKHandle[], buffers: ArrayBuffer[]) => OneSDKResult>

export type OneSDKDispatch = (index: number, data: AnyMap, handles: OneSDKHandle[], buffers: ArrayBuffer[]) => void

// the one native surface every generated sdk binding calls. `id` numbers a
// symbol in the module's generated table; direct calls pass primitives,
// buffers, dates, structs and handles as Nitro values, and container or
// callback calls pass a OneSDKResult envelope.
export interface OneSDK extends HybridObject<{ ios: 'swift' }> {
  // the generated table observes a property by key-value observing or observation tracking
  observe(module: string, id: number, data: AnyMap, handles: OneSDKHandle[], listener: (result: OneSDKResult) => void): () => void
  // follows a handle holding a Combine publisher or an AsyncSequence
  subscribe(handle: OneSDKHandle, listener: (result: OneSDKResult) => void): () => void
  call(
    module: string,
    id: number,
    receiver: OneSDKValue,
    arg0: OneSDKValue,
    arg1: OneSDKValue,
    dispatch?: OneSDKDispatch
  ): OneSDKValue
  callSync(
    module: string,
    id: number,
    data: OneSDKResult,
    dispatch: OneSDKDispatch,
    syncDispatch: OneSDKSyncDispatch
  ): OneSDKValue
  callFunction(
    handle: OneSDKHandle,
    arg0: OneSDKValue,
    arg1: OneSDKValue,
    dispatch?: OneSDKDispatch
  ): Promise<OneSDKValue>
  callAsync(
    module: string,
    id: number,
    receiver: OneSDKValue,
    arg0: OneSDKValue,
    arg1: OneSDKValue,
    dispatch?: OneSDKDispatch
  ): Promise<OneSDKValue>
}

