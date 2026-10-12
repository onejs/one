import { installDigestPolyfill } from './digest'
import { NitroModules } from 'react-native-nitro-modules'
import type { OneCrypto } from '../specs/OneCrypto.nitro'
import { installCryptoPolyfill, type RandomSource } from './random'

// secure random from the platform csprng (arc4random_buf on both) through the
// OneCrypto c++ hybrid object, created on first use and cached. bytes land in
// the caller's own buffer, so getRandomValues allocates and copies nothing.
// never Math.random: a failed native call throws. private: installCrypto is
// the only consumer, and the global is the api.
let hybrid: OneCrypto | undefined

function native(): OneCrypto {
  return (hybrid ??= NitroModules.createHybridObject<OneCrypto>('OneCrypto'))
}

const nativeSource: RandomSource = {
  fill(bytes) {
    native().fillRandomBytes(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  },
  randomUUID: () => native().randomUUID(),
}

// installs globalThis.crypto secure random and digest when the runtime
// lacks them. no-ops when the binary has no OneCrypto: installing a throwing
// source would only replace a clear missing-crypto error with a confusing
// one at the call site.
export function installCrypto(): void {
  if (!NitroModules.hasHybridObject('OneCrypto')) {
    return
  }
  installCryptoPolyfill(nativeSource)
  installDigestPolyfill((algorithm, buffer, offset, length) =>
    native().digest(algorithm, buffer, offset, length)
  )
}
