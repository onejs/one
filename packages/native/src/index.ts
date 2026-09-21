import * as UI from './effects'

export * from './extras'
export * from './unsupported'
export { Compose } from './compose'
export { useNativeState, type NativeState } from './nativeState'
export { TextInput } from './universal/TextInput/index'
export type {
  TextInputProps,
  TextInputRef,
  TextInputSelection,
} from './universal/TextInput/textInputTypes'
export type * from './composeTypes'
export type * from './types'
export { Haptics, isHapticsAvailable } from './haptics/index'
export type { HapticImpact, HapticNotification, HapticsApi } from './haptics/index'
// web subset of the UI namespace (pure curve math, types, throwing
// component stubs). mirrors index.native.ts; see effects/index.ts.
export { UI }
