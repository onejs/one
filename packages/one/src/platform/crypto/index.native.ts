import { createAesApi, type AesEngine } from './aes'
import { installDigestPolyfill } from './digest'
import { createDigestApi } from './digest-api'
import { NitroModules } from 'react-native-nitro-modules'
import type { OneCrypto } from '../specs/OneCrypto.nitro'
import { installCryptoPolyfill, type RandomSource } from './random'
import type { Crypto as CryptoApi } from './types'

export type {
  AESDecryptOptions,
  AESEncryptOptions,
  AESKeySize,
  AESSealedDataConfig,
  BinaryInput,
  CryptoApi,
  DigestAlgorithm,
  DigestEncoding,
  DigestStringOptions,
  GCMNonceParam,
} from './types'
export type { AESEncryptionKey as AESEncryptionKeyType, AESSealedData as AESSealedDataType } from './aes'

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
// the public One.Crypto api over the same hybrid object: throwing module
// access is right here, unlike installCrypto below. a caller asking for a
// digest or a seal must learn the binary predates it, not get a fake.
function required(): OneCrypto {
  if (!NitroModules.hasHybridObject('OneCrypto')) {
    throw new Error('Crypto needs a native build that includes one')
  }
  return native()
}

const aesEngine: AesEngine = {
  async seal(key, iv, plaintext, additionalData, tagLength) {
    const sealed = await required().aesEncrypt(
      key.buffer,
      iv.buffer,
      plaintext.buffer,
      additionalData?.buffer,
      tagLength
    )
    return new Uint8Array(sealed)
  },
  async open(key, iv, ciphertextWithTag, additionalData, tagLength) {
    const opened = await required().aesDecrypt(
      key.buffer,
      iv.buffer,
      ciphertextWithTag.buffer,
      additionalData?.buffer,
      tagLength
    )
    return new Uint8Array(opened)
  },
  random(bytes) {
    required().fillRandomBytes(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  },
}

const aes = createAesApi(aesEngine)
const digestApi = createDigestApi((algorithm, buffer, offset, length) =>
  required().digest(algorithm, buffer, offset, length)
)

export const AESEncryptionKey = aes.AESEncryptionKey
export const AESSealedData = aes.AESSealedData

export const Crypto: CryptoApi = Object.freeze({
  digest: digestApi.digest,
  digestString: digestApi.digestString,
  aesEncrypt: aes.aesEncrypt,
  aesDecrypt: aes.aesDecrypt,
})

export function installCrypto(): void {
  if (!NitroModules.hasHybridObject('OneCrypto')) {
    return
  }
  installCryptoPolyfill(nativeSource)
  installDigestPolyfill((algorithm, buffer, offset, length) =>
    native().digest(algorithm, buffer, offset, length)
  )
}
