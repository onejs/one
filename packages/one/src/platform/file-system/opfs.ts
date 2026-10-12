import type {
  FileDirectories,
  FileEncoding,
  FileEntry,
  FileInfo,
} from '../specs/OneFileSystem.nitro'

export type { FileDirectories, FileEncoding, FileEntry, FileInfo }

// origin private file system backing shared by the flat functions and the
// File, Directory, Paths and FileHandle classes on web.

export const folders = ['documents', 'cache', 'applicationSupport', 'temporary'] as const

export const directories = Object.fromEntries(
  folders.map((name) => [name, `opfs://one/${name}/`])
) as unknown as FileDirectories

export function parts(uri: string): string[] {
  const url = new URL(uri)
  if (url.protocol !== 'opfs:' || url.host !== 'one' || url.search || url.hash) {
    throw new Error('FileSystem: expected an opfs://one/ URI')
  }
  const names = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  if (
    !folders.includes(names[0] as (typeof folders)[number]) ||
    names.some((name) => name === '.' || name === '..' || /[/\\\0]/.test(name))
  ) {
    throw new Error('FileSystem: invalid path')
  }
  return names
}

export async function root(): Promise<FileSystemDirectoryHandle> {
  if (!navigator.storage?.getDirectory)
    throw new Error('FileSystem: Origin Private File System is unavailable')
  const handle = await navigator.storage.getDirectory()
  for (const name of folders) await handle.getDirectoryHandle(name, { create: true })
  return handle
}

export async function parent(
  names: string[],
  create = false
): Promise<FileSystemDirectoryHandle> {
  let handle = await root()
  for (const name of names.slice(0, -1))
    handle = await handle.getDirectoryHandle(name, { create })
  return handle
}

export async function entry(
  names: string[]
): Promise<FileSystemFileHandle | FileSystemDirectoryHandle> {
  const handle = await parent(names)
  const name = names.at(-1)!
  try {
    return await handle.getFileHandle(name)
  } catch (error) {
    if ((error as DOMException).name !== 'TypeMismatchError') throw error
    return handle.getDirectoryHandle(name)
  }
}

export async function info(uri: string): Promise<FileInfo> {
  const names = parts(uri)
  try {
    const handle = await entry(names)
    if (handle.kind === 'directory') return { uri, exists: true, isDirectory: true }
    const file = await handle.getFile()
    return {
      uri,
      exists: true,
      isDirectory: false,
      size: file.size,
      modifiedAt: file.lastModified,
    }
  } catch (error) {
    if ((error as DOMException).name !== 'NotFoundError') throw error
    return { uri, exists: false, isDirectory: false }
  }
}

export async function write(
  handle: FileSystemFileHandle,
  data: string | Blob | Uint8Array
): Promise<void> {
  const writable = await handle.createWritable()
  try {
    await writable.write(data as FileSystemWriteChunkType)
    await writable.close()
  } catch (error) {
    await writable.abort().catch(() => {})
    throw error
  }
}

async function copyEntry(
  source: FileSystemFileHandle | FileSystemDirectoryHandle,
  target: FileSystemDirectoryHandle,
  name: string
): Promise<void> {
  if (source.kind === 'file') {
    await write(
      await target.getFileHandle(name, { create: true }),
      await source.getFile()
    )
  } else {
    const directory = await target.getDirectoryHandle(name, { create: true })
    for await (const [childName, child] of source.entries())
      await copyEntry(child, directory, childName)
  }
}

export async function transfer(fromUri: string, toUri: string, move: boolean): Promise<void> {
  const from = parts(fromUri),
    to = parts(toUri)
  if (move && from.length === 1)
    throw new Error('FileSystem: app root directories are protected')
  if (
    (to.length <= from.length && to.every((name, i) => name === from[i])) ||
    from.every((name, i) => name === to[i])
  )
    throw new Error('FileSystem: overlapping paths')
  const source = await entry(from)
  if ((await info(toUri)).exists)
    throw new Error('FileSystem: destination already exists')
  const destination = await parent(to)
  try {
    await copyEntry(source, destination, to.at(-1)!)
  } catch (error) {
    await destination.removeEntry(to.at(-1)!, { recursive: true }).catch(() => {})
    throw error
  }
  if (move) await (await parent(from)).removeEntry(from.at(-1)!, { recursive: true })
}

// opfs mutations share the native serial ordering, including queries queued
// behind a write and competing copy destinations.
let tail: Promise<unknown> = Promise.resolve()

export function serial<T>(work: () => Promise<T>): Promise<T> {
  const next = tail.then(work)
  tail = next.catch(() => {})
  return next
}
