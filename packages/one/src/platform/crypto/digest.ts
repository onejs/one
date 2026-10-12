// the native source snapshots the input before returning, then hashes off the
// js thread. only the global webcrypto surface consumes this private adapter.
export type DigestSource = (
  algorithm: string,
  buffer: ArrayBuffer,
  offset: number,
  length: number
) => Promise<ArrayBuffer>

type DigestTarget = {
  crypto?: {
    subtle?: { digest?: unknown } | null
  } | null
}

function namedError(name: string, message: string): Error {
  // hermes has no DOMException. preserve the standard rejection name, as
  // the secure random polyfill does for QuotaExceededError.
  const error = new Error(message)
  error.name = name
  return error
}

export function installDigestPolyfill(
  source: DigestSource,
  target: DigestTarget = globalThis
): void {
  const crypto = target.crypto
  if (crypto == null || typeof crypto.subtle?.digest === 'function') return
  const digest = async (
    algorithm: AlgorithmIdentifier,
    data: BufferSource
  ): Promise<ArrayBuffer> => {
    let buffer: ArrayBuffer
    let offset = 0
    let length: number
    if (data instanceof ArrayBuffer) {
      buffer = data
      length = data.byteLength
    } else if (ArrayBuffer.isView(data) && data.buffer instanceof ArrayBuffer) {
      buffer = data.buffer
      offset = data.byteOffset
      length = data.byteLength
    } else {
      throw new TypeError('crypto.subtle.digest: expected an ArrayBuffer or view.')
    }
    // reject detached buffers before entering native code, including empty views.
    new Uint8Array(buffer, offset, length)
    let name: string
    if (
      algorithm !== null &&
      (typeof algorithm === 'object' || typeof algorithm === 'function')
    ) {
      const value = (algorithm as Algorithm).name
      if (value === undefined) {
        throw new TypeError('crypto.subtle.digest: algorithm.name is required.')
      }
      name = `${value}`
    } else {
      name = `${algorithm}`
    }
    if (!/^sha-(1|256|384|512)$/i.test(name)) {
      throw namedError('NotSupportedError', `Unsupported digest algorithm: ${name}.`)
    }
    try {
      return await source(name.toUpperCase(), buffer, offset, length)
    } catch (error) {
      throw namedError(
        'OperationError',
        error instanceof Error ? error.message : 'Native digest failed.'
      )
    }
  }
  if (crypto.subtle == null) crypto.subtle = { digest }
  else crypto.subtle.digest = digest
}
