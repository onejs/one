import { NitroModules } from 'react-native-nitro-modules'
import type { OneCrypto } from '../specs/OneCrypto.nitro'
import { assertByteCount, installCryptoPolyfill, type RandomBytesSource } from './random'

// count cryptographically secure bytes from SecRandomCopyBytes /
// SecureRandom through the OneCrypto nitro hybrid object, created on first
// use and cached. never Math.random: a failed native call throws. private:
// installCrypto is the only consumer, and the global is the api.
let hybrid: OneCrypto | undefined

function getSecureRandomBytes(count: number): Uint8Array {
  assertByteCount(count)
  if (count === 0) {
    return new Uint8Array(0)
  }
  hybrid ??= NitroModules.createHybridObject<OneCrypto>('OneCrypto')
  const bytes = new Uint8Array(hybrid.getRandomBytes(count))
  if (bytes.length !== count) {
    throw new Error(`secure random: expected ${count} bytes, got ${bytes.length}.`)
  }
  return bytes
}

const nativeSource: RandomBytesSource = (count: number) => getSecureRandomBytes(count)

// installs globalThis.crypto.getRandomValues + randomUUID when the runtime
// lacks them. no-ops when the binary has no OneCrypto: installing a throwing
// source would only replace a clear missing-crypto error with a confusing
// one at the call site.
export function installCrypto(): void {
  if (!NitroModules.hasHybridObject('OneCrypto')) {
    return
  }
  installCryptoPolyfill(nativeSource)
}
