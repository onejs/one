import type { HybridObject } from 'react-native-nitro-modules'

// secure random bytes for the crypto polyfill. sync: getRandomValues is a
// sync web api, so the bytes cross jsi as one buffer with no hex encoding.
// throws on an invalid count or a failed platform generator, never returns
// weak bytes.
export interface OneCrypto extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getRandomBytes(count: number): ArrayBuffer
}
