import { FileMode, type FileDigestAlgorithm } from './types'
import type { FileEncoding } from '../specs/OneFileSystem.nitro'

// caller-mistake checks shared by the native and web classes: same check and
// message on both platforms, thrown synchronously at the js boundary.

const modes = new Set<string>(Object.values(FileMode))
const algorithms = new Set<string>(['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'])
const encodings = new Set<string>(['utf8', 'base64'])

export function assertUri(uri: unknown, owner: string): asserts uri is string {
  if (typeof uri !== 'string') throw new Error(`${owner}: expected a uri string`)
  let parsed: URL
  try {
    parsed = new URL(uri)
  } catch {
    throw new Error(`${owner}: expected an absolute file uri`)
  }
  if (
    (parsed.protocol !== 'file:' && parsed.protocol !== 'opfs:' && parsed.protocol !== 'asset:') ||
    !parsed.pathname.startsWith('/') ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(`${owner}: expected an absolute file uri`)
  }
}

export function assertMode(mode: unknown, owner: string): asserts mode is FileMode {
  if (typeof mode !== 'string' || !modes.has(mode)) {
    throw new Error(`${owner}: expected a FileMode`)
  }
}

export function assertEncoding(
  encoding: unknown,
  owner: string
): asserts encoding is FileEncoding {
  if (typeof encoding !== 'string' || !encodings.has(encoding)) {
    throw new Error(`${owner}: expected encoding 'utf8' or 'base64'`)
  }
}

export function assertAlgorithm(
  algorithm: unknown,
  owner: string
): asserts algorithm is FileDigestAlgorithm {
  if (typeof algorithm !== 'string' || !algorithms.has(algorithm)) {
    throw new Error(`${owner}: expected a digest algorithm`)
  }
}

export function assertByteLength(length: unknown, owner: string): asserts length is number {
  if (typeof length !== 'number' || !Number.isInteger(length) || length < 0) {
    throw new Error(`${owner}: expected a nonnegative integer byte length`)
  }
}

export function assertOffset(offset: unknown, owner: string): asserts offset is number {
  if (typeof offset !== 'number' || !Number.isFinite(offset) || offset < 0) {
    throw new Error(`${owner}: expected a finite nonnegative offset`)
  }
}

export function assertName(name: unknown, owner: string): asserts name is string {
  if (
    typeof name !== 'string' ||
    name === '' ||
    name.includes('/') ||
    name === '.' ||
    name === '..'
  ) {
    throw new Error(`${owner}: expected a single path segment`)
  }
}

export function assertWriteContent(
  content: unknown,
  owner: string
): asserts content is string | Uint8Array | ArrayBuffer {
  if (
    typeof content !== 'string' &&
    !(content instanceof Uint8Array) &&
    !(content instanceof ArrayBuffer)
  ) {
    throw new Error(`${owner}: expected a string, Uint8Array or ArrayBuffer`)
  }
}

export function assertWriteBytes(
  bytes: unknown,
  owner: string
): asserts bytes is Uint8Array | ArrayBuffer {
  if (!(bytes instanceof Uint8Array) && !(bytes instanceof ArrayBuffer)) {
    throw new Error(`${owner}: expected a Uint8Array or ArrayBuffer`)
  }
}

export function assertReadable(mode: FileMode, verb: string): void {
  if (mode !== FileMode.ReadOnly && mode !== FileMode.ReadWrite) {
    throw new Error(`${verb}: the handle is not readable`)
  }
}

export function assertWritable(mode: FileMode, verb: string): void {
  if (mode === FileMode.ReadOnly) {
    throw new Error(`${verb}: the handle is not writable`)
  }
}

export function assertDestination(
  destination: unknown,
  owner: string
): asserts destination is { uri: string } {
  if (
    typeof destination !== 'object' ||
    destination === null ||
    typeof (destination as { uri?: unknown }).uri !== 'string'
  ) {
    throw new Error(`${owner}: expected a File or Directory destination`)
  }
}
