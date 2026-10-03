import type { HybridObject } from 'react-native-nitro-modules'

// secure random for the crypto polyfill, one c++ implementation over the
// platform csprng. sync because getRandomValues and randomUUID are sync web
// apis. fillRandomBytes writes `length` bytes into `buffer` from `offset` in
// place and throws on a range outside it; it never returns weak bytes.
export interface OneCrypto extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  fillRandomBytes(buffer: ArrayBuffer, offset: number, length: number): void
  randomUUID(): string
}
