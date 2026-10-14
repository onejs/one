import type { AesEngine } from './aes'
import type { DigestSource } from './digest'

// the web engine: SubtleCrypto does the AES-GCM and SHA work. MD5 is not a
// WebCrypto algorithm, so it rejects asking for a native build instead of
// hashing with something weaker or wrong. on the server there is no subtle
// either, and the same rejection applies, so importing this under SSR is
// safe and only calling it fails.
function subtle(verb: string): SubtleCrypto {
  const found = globalThis.crypto?.subtle
  if (!found) {
    throw new Error(`${verb} needs a browser with WebCrypto or a native build that includes one`)
  }
  return found
}

export const webDigestSource: DigestSource = async (algorithm, buffer, offset, length) => {
  if (algorithm === 'MD5') {
    throw new Error('Crypto.digest: MD5 needs an iOS or Android build')
  }
  return subtle('Crypto.digest').digest(algorithm, new Uint8Array(buffer, offset, length))
}

async function importKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return subtle('Crypto.aesEncrypt').importKey('raw', raw, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

export const webAesEngine: AesEngine = {
  async seal(key, iv, plaintext, additionalData, tagLength) {
    const sealed = await subtle('Crypto.aesEncrypt').encrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: tagLength * 8,
        ...(additionalData ? { additionalData } : {}),
      },
      await importKey(key),
      plaintext
    )
    return new Uint8Array(sealed)
  },
  async open(key, iv, ciphertextWithTag, additionalData, tagLength) {
    try {
      const opened = await subtle('Crypto.aesDecrypt').decrypt(
        {
          name: 'AES-GCM',
          iv,
          tagLength: tagLength * 8,
          ...(additionalData ? { additionalData } : {}),
        },
        await importKey(key),
        ciphertextWithTag
      )
      return new Uint8Array(opened)
    } catch {
      throw new Error('Crypto.aesDecrypt: authentication failed')
    }
  },
  random(bytes) {
    const getRandomValues = globalThis.crypto?.getRandomValues
    if (typeof getRandomValues !== 'function') {
      throw new Error('secure random: web crypto is unavailable in this browser.')
    }
    getRandomValues.call(globalThis.crypto, bytes)
  },
}
