// shared crypto helpers: pure and platform-free, so the formatting, the
// fill semantics, and the install-only-when-missing rule unit-test in node.
// the only platform part is the byte source each entry injects.

export const MAX_RANDOM_BYTES = 65536

export type RandomBytesSource = (count: number) => Uint8Array

export function assertByteCount(count: number): void {
  if (!Number.isInteger(count) || count < 0 || count > MAX_RANDOM_BYTES) {
    throw new RangeError(
      `secure random: count must be an integer 0..${MAX_RANDOM_BYTES}, got ${String(count)}.`
    )
  }
}

function nibble(code: number): number {
  if (code >= 48 && code <= 57) return code - 48
  if (code >= 97 && code <= 102) return code - 87
  if (code >= 65 && code <= 70) return code - 55
  return -1
}

// decodes the lowercase hex the native modules return. validates length
// and digits strictly: a truncated or corrupt bridge payload must throw,
// never silently fill with weak bytes.
export function decodeHexBytes(hex: string, expectedLength: number): Uint8Array {
  if (hex.length !== expectedLength * 2) {
    throw new Error(
      `secure random: expected ${expectedLength * 2} hex chars, got ${hex.length}.`
    )
  }
  const out = new Uint8Array(expectedLength)
  for (let i = 0; i < expectedLength; i++) {
    const hi = nibble(hex.charCodeAt(i * 2))
    const lo = nibble(hex.charCodeAt(i * 2 + 1))
    if (hi === -1 || lo === -1) {
      throw new Error(`secure random: invalid hex at byte ${i}.`)
    }
    out[i] = hi * 16 + lo
  }
  return out
}

const HEX_DIGITS = '0123456789abcdef'

// rfc 4122 section 4.4: 16 random bytes with the version nibble set to 4
// and the variant bits to 10. copies the input so caller buffers stay
// untouched.
export function formatUuidV4(bytes: Uint8Array): string {
  if (bytes.length !== 16) {
    throw new RangeError(`randomUUID: expected 16 random bytes, got ${bytes.length}.`)
  }
  const versioned = bytes.slice()
  versioned[6] = (versioned[6] & 0x0f) | 0x40
  versioned[8] = (versioned[8] & 0x3f) | 0x80
  const hex = (index: number) =>
    HEX_DIGITS[versioned[index] >> 4] + HEX_DIGITS[versioned[index] & 15]
  return (
    hex(0) +
    hex(1) +
    hex(2) +
    hex(3) +
    '-' +
    hex(4) +
    hex(5) +
    '-' +
    hex(6) +
    hex(7) +
    '-' +
    hex(8) +
    hex(9) +
    '-' +
    hex(10) +
    hex(11) +
    hex(12) +
    hex(13) +
    hex(14) +
    hex(15)
  )
}

// integer TypedArrays only, matching the platform getRandomValues: float
// arrays and DataView throw a TypeError, and fills over 64k throw a
// QuotaExceededError-named Error (Hermes has no DOMException). fills
// byte-wise through the view's own offset and length, so sub-array views
// and big-int arrays both work.
const INTEGER_ARRAY_TAGS = new Set([
  '[object Int8Array]',
  '[object Uint8Array]',
  '[object Uint8ClampedArray]',
  '[object Int16Array]',
  '[object Uint16Array]',
  '[object Int32Array]',
  '[object Uint32Array]',
  '[object BigInt64Array]',
  '[object BigUint64Array]',
])

function quotaExceededError(): Error {
  const error = new Error(
    `crypto.getRandomValues: byteLength exceeds ${MAX_RANDOM_BYTES}.`
  )
  error.name = 'QuotaExceededError'
  return error
}

export function fillRandomValues<T extends ArrayBufferView>(
  view: T,
  source: RandomBytesSource
): T {
  if (!INTEGER_ARRAY_TAGS.has(Object.prototype.toString.call(view))) {
    throw new TypeError(
      `crypto.getRandomValues: expected an integer TypedArray, got ${Object.prototype.toString.call(view)}.`
    )
  }
  if (view.byteLength > MAX_RANDOM_BYTES) {
    throw quotaExceededError()
  }
  if (view.byteLength === 0) {
    return view
  }
  new Uint8Array(view.buffer, view.byteOffset, view.byteLength).set(
    source(view.byteLength)
  )
  return view
}

// installs getRandomValues and randomUUID onto target.crypto, but only the
// pieces that are missing: an existing native implementation always wins,
// and each method is checked independently. the target shape is structural
// so both the real global and plain test objects fit without a cast.
export type CryptoPolyfillTarget = {
  crypto?: {
    getRandomValues?: unknown
    randomUUID?: unknown
  } | null
}

export function installCryptoPolyfill(
  source: RandomBytesSource,
  target: CryptoPolyfillTarget = globalThis
): void {
  const existing = target.crypto
  if (
    existing != null &&
    typeof existing.getRandomValues === 'function' &&
    typeof existing.randomUUID === 'function'
  ) {
    return
  }
  const getRandomValues = <T extends ArrayBufferView>(view: T): T =>
    fillRandomValues(view, source)
  const randomUUID = (): string => formatUuidV4(source(16))
  if (existing == null) {
    target.crypto = { getRandomValues, randomUUID }
    return
  }
  if (typeof existing.getRandomValues !== 'function') {
    existing.getRandomValues = getRandomValues
  }
  if (typeof existing.randomUUID !== 'function') {
    existing.randomUUID = randomUUID
  }
}
