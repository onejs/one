// pure byte encodings for the crypto api: hex, base64 and utf-8 without
// depending on host globals (Hermes has no TextEncoder and atob/btoa are
// string-in/string-out with latin1 semantics, so binary hosted there would
// corrupt bytes above 127).

const HEX_DIGITS = '0123456789abcdef'

export function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += HEX_DIGITS[byte >> 4] + HEX_DIGITS[byte & 15]
  return out
}

export function hexToBytes(hex: string, verb: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) {
    throw new Error(`${verb}: expected an even-length hex string`)
  }
  const out = new Uint8Array(hex.length / 2)
  for (let index = 0; index < out.length; index++) {
    out[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return out
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const BASE64_VALUES = new Int16Array(128).fill(-1)
for (let index = 0; index < BASE64_ALPHABET.length; index++) {
  BASE64_VALUES[BASE64_ALPHABET.charCodeAt(index)] = index
}

export function bytesToBase64(bytes: Uint8Array): string {
  let out = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]
    const second = bytes[index + 1]
    const third = bytes[index + 2]
    out += BASE64_ALPHABET[first >> 2]
    out += BASE64_ALPHABET[((first & 3) << 4) | ((second ?? 0) >> 4)]
    out += second === undefined ? '=' : BASE64_ALPHABET[((second & 15) << 2) | ((third ?? 0) >> 6)]
    out += third === undefined ? '=' : BASE64_ALPHABET[third & 63]
  }
  return out
}

// strict: standard alphabet, length a multiple of four, padding only at the
// end. anything else throws instead of decoding to a best guess.
export function base64ToBytes(base64: string, verb: string): Uint8Array<ArrayBuffer> {
  if (base64.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(base64)) {
    throw new Error(`${verb}: expected a base64 string`)
  }
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  if (base64.slice(0, base64.length - padding).includes('=')) {
    throw new Error(`${verb}: expected a base64 string`)
  }
  const out = new Uint8Array((base64.length / 4) * 3 - padding)
  let at = 0
  for (let index = 0; index < base64.length; index += 4) {
    const values = [0, 1, 2, 3].map((offset) => {
      const code = base64.charCodeAt(index + offset)
      return code === 61 ? 0 : BASE64_VALUES[code]
    })
    if (values.some((value) => value < 0)) throw new Error(`${verb}: expected a base64 string`)
    if (at < out.length) out[at++] = (values[0] << 2) | (values[1] >> 4)
    if (at < out.length) out[at++] = ((values[1] & 15) << 4) | (values[2] >> 2)
    if (at < out.length) out[at++] = ((values[2] & 3) << 6) | values[3]
  }
  return out
}

// utf-8 encoding for digestString. unpaired surrogates encode as the
// replacement character, matching TextEncoder.
export function utf8Encode(text: string): Uint8Array<ArrayBuffer> {
  const bytes: number[] = []
  for (let index = 0; index < text.length; index++) {
    let code = text.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)
        index++
      } else {
        code = 0xfffd
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      code = 0xfffd
    }
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63))
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63))
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63)
      )
    }
  }
  return new Uint8Array(bytes)
}

// a fresh exact-size copy: what native receives, so a caller mutating its
// view after the call cannot change bytes in flight.
export function exactBytes(view: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(view)
}

export function concatBytes(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const length = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(length)
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}
