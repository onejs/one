import { rethrowNativeError } from '../nativeError'
import type { OneFileSystem } from '../specs/OneFileSystem.nitro'
import { fileSystemNative } from './hybrid.native'
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

function native(): OneFileSystem {
  return fileSystemNative()
}

function sync<T>(work: () => T): T {
  try {
    return work()
  } catch (error) {
    return rethrowNativeError(error)
  }
}

function toArrayBuffer(bytes: Uint8Array | ArrayBuffer): ArrayBuffer {
  if (bytes instanceof ArrayBuffer) return bytes
  if (
    bytes.buffer instanceof ArrayBuffer &&
    bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength
  ) {
    return bytes.buffer
  }
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

export class FileHandle {
  private handleId: number
  private mode: FileMode
  private closed = false

  // obtain through File.open(); the id is an opaque native handle.
  constructor(handle: number, mode: FileMode = FileMode.ReadWrite) {
    assertMode(mode, 'FileHandle')
    this.handleId = handle
    this.mode = mode
  }

  get offset(): number | null {
    if (this.closed) return null
    return sync(() => native().getHandleOffset(this.handleId))
  }

  set offset(value: number) {
    this.assertOpen('offset')
    assertOffset(value, 'FileHandle.offset')
    sync(() => native().setHandleOffset(this.handleId, value))
  }

  get size(): number | null {
    if (this.closed) return null
    return sync(() => native().getHandleSize(this.handleId))
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    sync(() => native().closeFile(this.handleId))
  }

  readBytes(length: number): Promise<Uint8Array<ArrayBuffer>> {
    this.assertOpen('readBytes')
    assertReadable(this.mode, 'FileHandle.readBytes')
    assertByteLength(length, 'FileHandle.readBytes')
    return native()
      .readHandleAsync(this.handleId, length)
      .then((buffer) => new Uint8Array(buffer))
      .catch(rethrowNativeError)
  }

  readBytesSync(length: number): Uint8Array<ArrayBuffer> {
    this.assertOpen('readBytesSync')
    assertReadable(this.mode, 'FileHandle.readBytesSync')
    assertByteLength(length, 'FileHandle.readBytesSync')
    return new Uint8Array(sync(() => native().readHandle(this.handleId, length)))
  }

  writeBytes(bytes: Uint8Array | ArrayBuffer): Promise<void> {
    this.assertOpen('writeBytes')
    assertWritable(this.mode, 'FileHandle.writeBytes')
    assertWriteBytes(bytes, 'FileHandle.writeBytes')
    return native().writeHandleAsync(this.handleId, toArrayBuffer(bytes)).catch(rethrowNativeError)
  }

  writeBytesSync(bytes: Uint8Array | ArrayBuffer): void {
    this.assertOpen('writeBytesSync')
    assertWritable(this.mode, 'FileHandle.writeBytesSync')
    assertWriteBytes(bytes, 'FileHandle.writeBytesSync')
    sync(() => native().writeHandle(this.handleId, toArrayBuffer(bytes)))
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
    return sync(() => native().fileDetails(this.currentUri)).exists
  }

  get size(): number {
    return sync(() => native().fileDetails(this.currentUri)).size
  }

  get type(): string {
    return sync(() => native().fileDetails(this.currentUri)).mimeType
  }

  get creationTime(): number | null {
    return sync(() => native().fileDetails(this.currentUri)).creationTime ?? null
  }

  get lastModified(): number | null {
    return sync(() => native().fileDetails(this.currentUri)).modificationTime ?? null
  }

  text(): Promise<string> {
    return native().readTextAsync(this.currentUri).catch(rethrowNativeError)
  }

  textSync(): string {
    return sync(() => native().readText(this.currentUri))
  }

  bytes(): Promise<Uint8Array<ArrayBuffer>> {
    return native()
      .readDataAsync(this.currentUri)
      .then((buffer) => new Uint8Array(buffer))
      .catch(rethrowNativeError)
  }

  bytesSync(): Uint8Array<ArrayBuffer> {
    return new Uint8Array(sync(() => native().readData(this.currentUri)))
  }

  base64(): Promise<string> {
    return native().readBase64Async(this.currentUri).catch(rethrowNativeError)
  }

  base64Sync(): string {
    return sync(() => native().readBase64(this.currentUri))
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return (await this.bytes()).buffer
  }

  async json(): Promise<any> {
    return JSON.parse(await this.text())
  }

  info(): FileStat {
    const details = sync(() => native().fileDetails(this.currentUri))
    if (!details.exists) return { exists: false, uri: this.currentUri }
    return {
      exists: true,
      uri: this.currentUri,
      size: details.size,
      ...(details.modificationTime !== undefined && {
        modificationTime: details.modificationTime,
      }),
      ...(details.creationTime !== undefined && { creationTime: details.creationTime }),
    }
  }

  digest(algorithm: FileDigestAlgorithm): Promise<string> {
    assertAlgorithm(algorithm, 'File.digest')
    return native().fileDigest(this.currentUri, algorithm).catch(rethrowNativeError)
  }

  write(content: string | Uint8Array | ArrayBuffer, options?: FileWriteOptions): Promise<void> {
    assertWriteContent(content, 'File.write')
    const append = options?.append ?? false
    if (typeof content === 'string') {
      const encoding = options?.encoding ?? 'utf8'
      assertEncoding(encoding, 'File.write')
      return native().writeTextAsync(this.currentUri, content, encoding, append).catch(rethrowNativeError)
    }
    if (options?.encoding !== undefined) assertEncoding(options.encoding, 'File.write')
    return native().writeDataAsync(this.currentUri, toArrayBuffer(content), append).catch(rethrowNativeError)
  }

  writeSync(content: string | Uint8Array | ArrayBuffer, options?: FileWriteOptions): void {
    assertWriteContent(content, 'File.writeSync')
    const append = options?.append ?? false
    if (typeof content === 'string') {
      const encoding = options?.encoding ?? 'utf8'
      assertEncoding(encoding, 'File.writeSync')
      sync(() => native().writeText(this.currentUri, content, encoding, append))
      return
    }
    if (options?.encoding !== undefined) assertEncoding(options.encoding, 'File.writeSync')
    sync(() => native().writeData(this.currentUri, toArrayBuffer(content), append))
  }

  create(options?: FileCreateOptions): void {
    sync(() =>
      native().createFileEntry(this.currentUri, options?.intermediates ?? false, options?.overwrite ?? false)
    )
  }

  delete(): void {
    sync(() => native().deleteEntry(this.currentUri))
  }

  copy(destination: File | Directory, options?: RelocationOptions): Promise<void> {
    const to = resolveDestination(this, destination, 'File.copy')
    return native().copyEntryAsync(this.currentUri, to, options?.overwrite ?? false).catch(rethrowNativeError)
  }

  copySync(destination: File | Directory, options?: RelocationOptions): void {
    const to = resolveDestination(this, destination, 'File.copySync')
    sync(() => native().copyEntry(this.currentUri, to, options?.overwrite ?? false))
  }

  move(destination: File | Directory, options?: RelocationOptions): Promise<void> {
    const to = resolveDestination(this, destination, 'File.move')
    if (to === this.currentUri) return Promise.resolve()
    return native()
      .moveEntryAsync(this.currentUri, to, options?.overwrite ?? false)
      .then(() => {
        this.currentUri = to
      })
      .catch(rethrowNativeError)
  }

  moveSync(destination: File | Directory, options?: RelocationOptions): void {
    const to = resolveDestination(this, destination, 'File.moveSync')
    if (to === this.currentUri) return
    sync(() => native().moveEntry(this.currentUri, to, options?.overwrite ?? false))
    this.currentUri = to
  }

  rename(newName: string): void {
    assertName(newName, 'File.rename')
    if (newName === this.name) return
    this.currentUri = sync(() => native().renameEntry(this.currentUri, newName))
  }

  open(mode: FileMode = FileMode.ReadWrite): FileHandle {
    assertMode(mode, 'File.open')
    return new FileHandle(sync(() => native().openFile(this.currentUri, mode)), mode)
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
    return sync(() => native().directoryDetails(this.currentUri)).exists
  }

  get size(): number | null {
    return sync(() => native().directoryDetails(this.currentUri)).size ?? null
  }

  list(): (File | Directory)[] {
    return sync(() => native().listEntries(this.currentUri)).map((entry) =>
      entry.isDirectory ? new Directory(entry.uri) : new File(entry.uri)
    )
  }

  info(): DirectoryStat {
    const details = sync(() => native().directoryDetails(this.currentUri))
    if (!details.exists) return { exists: false, uri: this.currentUri }
    return {
      exists: true,
      uri: this.currentUri,
      ...(details.size !== undefined && { size: details.size }),
      ...(details.modificationTime !== undefined && {
        modificationTime: details.modificationTime,
      }),
      ...(details.creationTime !== undefined && { creationTime: details.creationTime }),
      ...(details.files !== undefined && { files: details.files }),
    }
  }

  create(options?: DirectoryCreateOptions): void {
    sync(() =>
      native().createDirectoryEntry(
        this.currentUri,
        options?.intermediates ?? false,
        options?.overwrite ?? false,
        options?.idempotent ?? false
      )
    )
  }

  createFile(name: string, mimeType: string | null): File {
    assertName(name, 'Directory.createFile')
    if (typeof mimeType !== 'string' && mimeType !== null) {
      throw new Error('Directory.createFile: expected a mime type string or null')
    }
    // file urls carry no mime metadata; the argument keeps expo's shape.
    return new File(sync(() => native().createFileInDirectory(this.currentUri, name)))
  }

  createDirectory(name: string): Directory {
    assertName(name, 'Directory.createDirectory')
    return new Directory(sync(() => native().createSubdirectory(this.currentUri, name)))
  }

  delete(): void {
    sync(() => native().deleteEntry(this.currentUri))
  }

  copy(destination: File | Directory, options?: RelocationOptions): Promise<void> {
    const to = resolveDestination(this, destination, 'Directory.copy')
    return native().copyEntryAsync(this.currentUri, to, options?.overwrite ?? false).catch(rethrowNativeError)
  }

  copySync(destination: File | Directory, options?: RelocationOptions): void {
    const to = resolveDestination(this, destination, 'Directory.copySync')
    sync(() => native().copyEntry(this.currentUri, to, options?.overwrite ?? false))
  }

  move(destination: File | Directory, options?: RelocationOptions): Promise<void> {
    const to = resolveDestination(this, destination, 'Directory.move')
    if (to === this.currentUri) return Promise.resolve()
    return native()
      .moveEntryAsync(this.currentUri, to, options?.overwrite ?? false)
      .then(() => {
        this.currentUri = to
      })
      .catch(rethrowNativeError)
  }

  moveSync(destination: File | Directory, options?: RelocationOptions): void {
    const to = resolveDestination(this, destination, 'Directory.moveSync')
    if (to === this.currentUri) return
    sync(() => native().moveEntry(this.currentUri, to, options?.overwrite ?? false))
    this.currentUri = to
  }

  rename(newName: string): void {
    assertName(newName, 'Directory.rename')
    if (newName === this.name) return
    this.currentUri = sync(() => native().renameEntry(this.currentUri, newName))
  }
}

export class Paths extends PathUtilities {
  static get cache(): Directory {
    return new Directory(sync(() => native().getDirectories()).cache)
  }

  static get document(): Directory {
    return new Directory(sync(() => native().getDirectories()).documents)
  }

  static get bundle(): Directory {
    return new Directory(sync(() => native().getBundleDirectory()))
  }

  static get totalDiskSpace(): number {
    return sync(() => native().getDiskSpace()).total
  }

  static get availableDiskSpace(): number {
    return sync(() => native().getDiskSpace()).available
  }

  static info(...uris: string[]): PathInfo {
    const stat = sync(() => native().pathInfo(uris.join('/')))
    return { exists: stat.exists, isDirectory: stat.isDirectory ?? null }
  }
}

export { FileMode }
