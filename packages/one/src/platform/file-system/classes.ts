import { directories, entry, parent, parts, serial, transfer, write } from './opfs'
import { PathUtilities } from './paths'
import { FileSystemReadableStreamSource, FileSystemWritableSink } from './streams'
import { FileMode } from './types'
import type {
  DirectoryCreateOptions,
  DirectoryStat,
  FileCreateOptions,
  FileDigestAlgorithm,
  FileStat,
  FileWriteOptions,
  PathInfo,
  RelocationOptions,
} from './types'
import {
  assertAlgorithm,
  assertByteLength,
  assertDestination,
  assertEncoding,
  assertMode,
  assertName,
  assertOffset,
  assertReadable,
  assertUri,
  assertWritable,
  assertWriteBytes,
  assertWriteContent,
} from './validate'

export type * from './types'

// File, Directory, Paths and FileHandle on web, over the origin private file
// system. the async members work; the synchronous twins cannot run on the
// main thread's async storage and throw. flat One.FileSystem methods cover
// web create, delete and list.

function unavailable(member: string): Error {
  return new Error(`${member} is not available on web`)
}

function server(): boolean {
  return typeof window === 'undefined'
}

function toBytes(content: Uint8Array | ArrayBuffer): Uint8Array<ArrayBuffer> {
  if (content instanceof ArrayBuffer) return new Uint8Array(content)
  if (content.buffer instanceof ArrayBuffer) {
    return new Uint8Array(content.buffer, content.byteOffset, content.byteLength)
  }
  const copy = new Uint8Array(content.byteLength)
  copy.set(content)
  return copy
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

async function fileEntry(uri: string): Promise<FileSystemFileHandle> {
  const handle = await entry(parts(uri))
  if (handle.kind !== 'file') throw new Error('FileSystem: expected a file')
  return handle
}

async function readWholeFile(uri: string): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await (await (await fileEntry(uri)).getFile()).arrayBuffer())
}

async function writePositioned(
  uri: string,
  position: number,
  data: Uint8Array<ArrayBuffer>
): Promise<void> {
  const handle = await fileEntry(uri)
  const writable = await handle.createWritable({ keepExistingData: true })
  try {
    await writable.write({ type: 'write', position, data })
    await writable.close()
  } catch (error) {
    await writable.abort().catch(() => {})
    throw error
  }
}

export class FileHandle {
  private targetUri: string
  private mode: FileMode
  private offsetValue = 0
  private closed = false
  private truncatePending: boolean
  private appendPending: boolean

  // obtain through File.open().
  constructor(uri: string, mode: FileMode = FileMode.ReadWrite) {
    assertUri(uri, 'FileHandle')
    assertMode(mode, 'FileHandle')
    this.targetUri = uri
    this.mode = mode
    this.truncatePending = mode === FileMode.Truncate
    this.appendPending = mode === FileMode.Append
  }

  get offset(): number | null {
    if (this.closed) return null
    return this.offsetValue
  }

  set offset(value: number) {
    this.assertOpen('offset')
    assertOffset(value, 'FileHandle.offset')
    this.offsetValue = value
    this.appendPending = false
  }

  get size(): number | null {
    if (this.closed) return null
    throw unavailable('FileHandle.size')
  }

  close(): void {
    this.closed = true
  }

  readBytes(length: number): Promise<Uint8Array<ArrayBuffer>> {
    this.assertOpen('readBytes')
    assertReadable(this.mode, 'FileHandle.readBytes')
    assertByteLength(length, 'FileHandle.readBytes')
    if (server()) return Promise.resolve(new Uint8Array())
    return serial(async () => {
      await this.prepare()
      const bytes = await readWholeFile(this.targetUri)
      const slice = bytes.slice(this.offsetValue, this.offsetValue + length)
      this.offsetValue += slice.length
      return slice
    })
  }

  readBytesSync(_length: number): Uint8Array<ArrayBuffer> {
    throw unavailable('FileHandle.readBytesSync')
  }

  writeBytes(bytes: Uint8Array | ArrayBuffer): Promise<void> {
    this.assertOpen('writeBytes')
    assertWritable(this.mode, 'FileHandle.writeBytes')
    assertWriteBytes(bytes, 'FileHandle.writeBytes')
    if (server()) return Promise.resolve()
    const data = toBytes(bytes)
    return serial(async () => {
      await this.prepare()
      let size = 0
      try {
        size = (await (await fileEntry(this.targetUri)).getFile()).size
      } catch (error) {
        if ((error as DOMException).name !== 'NotFoundError') throw error
        if (this.mode === FileMode.ReadOnly || this.mode === FileMode.ReadWrite) throw error
        const names = parts(this.targetUri)
        await (await parent(names)).getFileHandle(names.at(-1)!, { create: true })
      }
      const position = Math.min(this.offsetValue, size)
      await writePositioned(this.targetUri, position, data)
      this.offsetValue = position + data.length
    })
  }

  writeBytesSync(_bytes: Uint8Array | ArrayBuffer): void {
    throw unavailable('FileHandle.writeBytesSync')
  }

  private async prepare(): Promise<void> {
    if (this.truncatePending) {
      this.truncatePending = false
      this.offsetValue = 0
      const names = parts(this.targetUri)
      await write(await (await parent(names)).getFileHandle(names.at(-1)!, { create: true }), '')
    } else if (this.appendPending) {
      this.appendPending = false
      try {
        this.offsetValue = (await (await fileEntry(this.targetUri)).getFile()).size
      } catch (error) {
        if ((error as DOMException).name !== 'NotFoundError') throw error
        this.offsetValue = 0
      }
    }
  }

  private assertOpen(verb: string): void {
    if (this.closed) throw new Error(`FileHandle.${verb}: the handle is closed`)
  }
}

function resolveDestination(
  source: File | Directory,
  destination: File | Directory,
  verb: string
): string {
  assertDestination(destination, verb)
  if (destination instanceof Directory) {
    return PathUtilities.join(destination.uri, source.name)
  }
  if (destination instanceof File) return destination.uri
  throw new Error(`${verb}: expected a File or Directory destination`)
}

async function relocate(
  source: string,
  to: string,
  move: boolean,
  overwrite: boolean
): Promise<void> {
  if (overwrite && parts(to).length === 1) {
    throw new Error('FileSystem: app root directories are protected')
  }
  if (overwrite) {
    const names = parts(to)
    await (await parent(names)).removeEntry(names.at(-1)!, { recursive: true }).catch((error) => {
      if ((error as DOMException).name !== 'NotFoundError') throw error
    })
  }
  await transfer(source, to, move)
}

export class File {
  private currentUri: string

  constructor(...uris: (string | File | Directory)[]) {
    const joined = PathUtilities.join(...uris)
    assertUri(joined, 'File')
    this.currentUri = joined
  }

  get uri(): string {
    return this.currentUri
  }

  get name(): string {
    return PathUtilities.basename(this.currentUri)
  }

  get extension(): string {
    return PathUtilities.extname(this.currentUri)
  }

  get parentDirectory(): Directory {
    return new Directory(PathUtilities.dirname(this.currentUri))
  }

  get exists(): boolean {
    throw unavailable('File.exists')
  }

  get size(): number {
    throw unavailable('File.size')
  }

  get type(): string {
    throw unavailable('File.type')
  }

  get creationTime(): number | null {
    throw unavailable('File.creationTime')
  }

  get lastModified(): number | null {
    throw unavailable('File.lastModified')
  }

  text(): Promise<string> {
    if (server()) return Promise.resolve('')
    const uri = this.currentUri
    return serial(async () => (await (await fileEntry(uri)).getFile()).text())
  }

  textSync(): string {
    throw unavailable('File.textSync')
  }

  bytes(): Promise<Uint8Array<ArrayBuffer>> {
    if (server()) return Promise.resolve(new Uint8Array())
    const uri = this.currentUri
    return serial(() => readWholeFile(uri))
  }

  bytesSync(): Uint8Array<ArrayBuffer> {
    throw unavailable('File.bytesSync')
  }

  base64(): Promise<string> {
    if (server()) return Promise.resolve('')
    return this.bytes().then(toBase64)
  }

  base64Sync(): string {
    throw unavailable('File.base64Sync')
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return (await this.bytes()).buffer
  }

  async json(): Promise<any> {
    return JSON.parse(await this.text())
  }

  info(): FileStat {
    throw unavailable('File.info')
  }

  digest(algorithm: FileDigestAlgorithm): Promise<string> {
    assertAlgorithm(algorithm, 'File.digest')
    if (server()) return Promise.reject(new Error('File.digest is not available on the server'))
    if (algorithm === 'MD5') {
      return Promise.reject(new Error('File.digest: MD5 is not available on web'))
    }
    if (!globalThis.crypto?.subtle) return Promise.reject(unavailable('File.digest'))
    return this.bytes().then(async (bytes) => {
      const hash = await globalThis.crypto.subtle.digest(algorithm, bytes)
      return Array.from(new Uint8Array(hash))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
    })
  }

  write(content: string | Uint8Array | ArrayBuffer, options?: FileWriteOptions): Promise<void> {
    assertWriteContent(content, 'File.write')
    if (server()) return Promise.resolve()
    const append = options?.append ?? false
    let data: string | Uint8Array
    if (typeof content === 'string') {
      const encoding = options?.encoding ?? 'utf8'
      assertEncoding(encoding, 'File.write')
      if (encoding === 'base64') {
        if (
          !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(content)
        ) {
          throw new Error('FileSystem: invalid base64 contents')
        }
        data = Uint8Array.from(atob(content), (char) => char.charCodeAt(0))
      } else {
        data = content
      }
    } else {
      if (options?.encoding !== undefined) assertEncoding(options.encoding, 'File.write')
      data = toBytes(content)
    }
    const uri = this.currentUri
    return serial(async () => {
      if (append) {
        let existing = new Uint8Array()
        try {
          existing = await readWholeFile(uri)
        } catch (error) {
          if ((error as DOMException).name !== 'NotFoundError') throw error
        }
        const next = typeof data === 'string' ? new TextEncoder().encode(data) : data
        const combined = new Uint8Array(existing.length + next.length)
        combined.set(existing)
        combined.set(next, existing.length)
        data = combined
      }
      const names = parts(uri)
      await write(await (await parent(names)).getFileHandle(names.at(-1)!, { create: true }), data)
    })
  }

  writeSync(_content: string | Uint8Array | ArrayBuffer, _options?: FileWriteOptions): void {
    throw unavailable('File.writeSync')
  }

  create(_options?: FileCreateOptions): void {
    throw unavailable('File.create')
  }

  delete(): void {
    throw unavailable('File.delete')
  }

  copy(destination: File | Directory, options?: RelocationOptions): Promise<void> {
    const to = resolveDestination(this, destination, 'File.copy')
    if (server()) return Promise.resolve()
    const from = this.currentUri
    return serial(() => relocate(from, to, false, options?.overwrite ?? false))
  }

  copySync(_destination: File | Directory, _options?: RelocationOptions): void {
    throw unavailable('File.copySync')
  }

  move(destination: File | Directory, options?: RelocationOptions): Promise<void> {
    const to = resolveDestination(this, destination, 'File.move')
    if (to === this.currentUri || server()) return Promise.resolve()
    const from = this.currentUri
    return serial(() =>
      relocate(from, to, true, options?.overwrite ?? false).then(() => {
        this.currentUri = to
      })
    )
  }

  moveSync(_destination: File | Directory, _options?: RelocationOptions): void {
    throw unavailable('File.moveSync')
  }

  rename(_newName: string): void {
    throw unavailable('File.rename')
  }

  open(mode: FileMode = FileMode.ReadWrite): FileHandle {
    assertMode(mode, 'File.open')
    return new FileHandle(this.currentUri, mode)
  }

  readableStream(): ReadableStream<Uint8Array<ArrayBuffer>> {
    return new ReadableStream(new FileSystemReadableStreamSource(this.open(FileMode.ReadOnly)))
  }

  writableStream(): WritableStream<Uint8Array<ArrayBufferLike>> {
    return new WritableStream(new FileSystemWritableSink(this.open(FileMode.WriteOnly)))
  }

  stream(): ReadableStream<Uint8Array<ArrayBuffer>> {
    return this.readableStream()
  }
}

export class Directory {
  private currentUri: string

  constructor(...uris: (string | File | Directory)[]) {
    const joined = PathUtilities.join(...uris)
    assertUri(joined, 'Directory')
    this.currentUri = joined
  }

  get uri(): string {
    return this.currentUri
  }

  get name(): string {
    return PathUtilities.basename(this.currentUri)
  }

  get parentDirectory(): Directory {
    return new Directory(PathUtilities.join(this.currentUri, '..'))
  }

  get exists(): boolean {
    throw unavailable('Directory.exists')
  }

  get size(): number | null {
    throw unavailable('Directory.size')
  }

  list(): (File | Directory)[] {
    throw unavailable('Directory.list')
  }

  info(): DirectoryStat {
    throw unavailable('Directory.info')
  }

  create(_options?: DirectoryCreateOptions): void {
    throw unavailable('Directory.create')
  }

  createFile(_name: string, _mimeType: string | null): File {
    throw unavailable('Directory.createFile')
  }

  createDirectory(_name: string): Directory {
    throw unavailable('Directory.createDirectory')
  }

  delete(): void {
    throw unavailable('Directory.delete')
  }

  copy(destination: File | Directory, options?: RelocationOptions): Promise<void> {
    const to = resolveDestination(this, destination, 'Directory.copy')
    if (server()) return Promise.resolve()
    const from = this.currentUri
    return serial(() => relocate(from, to, false, options?.overwrite ?? false))
  }

  copySync(_destination: File | Directory, _options?: RelocationOptions): void {
    throw unavailable('Directory.copySync')
  }

  move(destination: File | Directory, options?: RelocationOptions): Promise<void> {
    const to = resolveDestination(this, destination, 'Directory.move')
    if (to === this.currentUri || server()) return Promise.resolve()
    const from = this.currentUri
    return serial(() =>
      relocate(from, to, true, options?.overwrite ?? false).then(() => {
        this.currentUri = to
      })
    )
  }

  moveSync(_destination: File | Directory, _options?: RelocationOptions): void {
    throw unavailable('Directory.moveSync')
  }

  rename(_newName: string): void {
    throw unavailable('Directory.rename')
  }
}

export class Paths extends PathUtilities {
  static get cache(): Directory {
    return new Directory(directories.cache)
  }

  static get document(): Directory {
    return new Directory(directories.documents)
  }

  static get bundle(): Directory {
    throw unavailable('Paths.bundle')
  }

  static get totalDiskSpace(): number {
    throw unavailable('Paths.totalDiskSpace')
  }

  static get availableDiskSpace(): number {
    throw unavailable('Paths.availableDiskSpace')
  }

  static info(..._uris: string[]): PathInfo {
    throw unavailable('Paths.info')
  }
}

export { FileMode }
