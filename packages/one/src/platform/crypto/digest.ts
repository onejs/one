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

// the exact byte range a BufferSource names, or a TypeError. detached
// buffers throw from the view construction, before any native call.
export function bufferSourceRange(
  data: BufferSource,
  verb: string
): { buffer: ArrayBuffer; offset: number; length: number } {
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
    throw new TypeError(`${verb}: expected an ArrayBuffer or view.`)
  }
  new Uint8Array(buffer, offset, length)
  return { buffer, offset, length }
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
    const { buffer, offset, length } = bufferSourceRange(data, 'crypto.subtle.digest')
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
