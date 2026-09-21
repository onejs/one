import { TurboModuleRegistry, type TurboModule } from 'react-native'

import {
  assertByteCount,
  decodeHexBytes,
  installCryptoPolyfill,
  type RandomBytesSource,
} from './random'

interface NativeCryptoSpec extends TurboModule {
  getRandomBytesHex(count: number): string | null
}

// the OneNativeCrypto legacy module, which TurboModuleRegistry.get falls
// back to. resolved once: the module set is static on device, so a null
// stays null and every call below throws rather than returning weak bytes.
let cachedModule: NativeCryptoSpec | null | undefined

function nativeModule(): NativeCryptoSpec | null {
  if (cachedModule === undefined) {
    cachedModule = TurboModuleRegistry.get<NativeCryptoSpec>('OneNativeCrypto') ?? null
  }
  return cachedModule
}

function isSecureRandomAvailable(): boolean {
  return nativeModule() !== null
}

// count cryptographically secure bytes from SecRandomCopyBytes /
// SecureRandom, carried over the bridge as lowercase hex. never
// Math.random: a missing module or a failed native call throws.
export function getSecureRandomBytes(count: number): Uint8Array {
  assertByteCount(count)
  if (count === 0) {
    return new Uint8Array(0)
  }
  const hex = nativeModule()?.getRandomBytesHex(count)
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
