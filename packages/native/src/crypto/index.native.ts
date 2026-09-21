import { TurboModuleRegistry } from 'react-native'

import {
  assertByteCount,
  decodeHexBytes,
  fillRandomValues,
  formatUuidV4,
  installCryptoPolyfill,
  MAX_RANDOM_BYTES,
  type RandomBytesSource,
} from './random'

export { fillRandomValues, formatUuidV4, installCryptoPolyfill, MAX_RANDOM_BYTES }
export type { RandomBytesSource }

type NativeCryptoModule = {
  getRandomBytesHex?: (count: number) => string | null
} | null

// the OneNativeCrypto legacy module, which TurboModuleRegistry.get falls
// back to. null on an old build (or any bundle without the native side),
// where every call below throws rather than returning weak bytes.
function nativeModule(): NativeCryptoModule {
  try {
    return TurboModuleRegistry.get('OneNativeCrypto') as NativeCryptoModule
  } catch {
    return null
  }
}

export function isSecureRandomAvailable(): boolean {
  return typeof nativeModule()?.getRandomBytesHex === 'function'
}

// count cryptographically secure bytes from SecRandomCopyBytes /
// SecureRandom, carried over the bridge as lowercase hex. never
// Math.random: a missing module or a failed native call throws.
export function getSecureRandomBytes(count: number): Uint8Array {
  assertByteCount(count)
  if (count === 0) {
    return new Uint8Array(0)
  }
  const hex = nativeModule()?.getRandomBytesHex?.(count)
  if (typeof hex !== 'string') {
    throw new Error(
      'secure random: the OneNativeCrypto native module is missing or failed.'
    )
  }
  return decodeHexBytes(hex, count)
}

const nativeSource: RandomBytesSource = (count: number) => getSecureRandomBytes(count)

// installs globalThis.crypto.getRandomValues + randomUUID when the runtime
// lacks them. no-ops without the native module: installing a throwing
// source would only replace a clear missing-crypto error with a confusing
// one at the call site.
export function installCrypto(): void {
  if (!isSecureRandomAvailable()) {
    return
  }
  installCryptoPolyfill(nativeSource)
}
