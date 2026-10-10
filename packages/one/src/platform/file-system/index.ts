import type {
  FileDirectories,
  FileEncoding,
  FileEntry,
  FileInfo,
} from '../specs/OneFileSystem.nitro'
export type { FileDirectories, FileEncoding, FileEntry, FileInfo }

const folders = ['documents', 'cache', 'applicationSupport', 'temporary'] as const
const directories = Object.fromEntries(
  folders.map((name) => [name, `opfs://one/${name}/`])
) as unknown as FileDirectories

function parts(uri: string): string[] {
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

async function root(): Promise<FileSystemDirectoryHandle> {
  if (!navigator.storage?.getDirectory)
    throw new Error('FileSystem: Origin Private File System is unavailable')
  const handle = await navigator.storage.getDirectory()
  for (const name of folders) await handle.getDirectoryHandle(name, { create: true })
  return handle
}

async function parent(
  names: string[],
  create = false
): Promise<FileSystemDirectoryHandle> {
  let handle = await root()
  for (const name of names.slice(0, -1))
    handle = await handle.getDirectoryHandle(name, { create })
  return handle
}

async function entry(
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

async function info(uri: string): Promise<FileInfo> {
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

async function write(
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

async function transfer(fromUri: string, toUri: string, move: boolean): Promise<void> {
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

const operations = Object.freeze({
  getDirectories: (): FileDirectories =>
    typeof window === 'undefined'
      ? { documents: '', cache: '', applicationSupport: '', temporary: '' }
      : { ...directories },
  getInfo: (uri: string): Promise<FileInfo> =>
    typeof window === 'undefined'
      ? Promise.resolve({ uri, exists: false, isDirectory: false })
      : info(uri),
  readDirectory: async (uri: string): Promise<FileEntry[]> => {
    if (typeof window === 'undefined') return []
    const names = parts(uri),
      handle = await entry(names)
    if (handle.kind !== 'directory') throw new Error('FileSystem: expected a directory')
    const entries: FileEntry[] = []
    for await (const [name, child] of handle.entries())
      entries.push({
        name,
        uri: `opfs://one/${[...names, name].map(encodeURIComponent).join('/')}${child.kind === 'directory' ? '/' : ''}`,
        isDirectory: child.kind === 'directory',
      })
    return entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  },
  makeDirectory: async (uri: string, intermediates = true): Promise<void> => {
    if (typeof window === 'undefined') return
    const names = parts(uri)
    await (
      await parent(names, intermediates)
    ).getDirectoryHandle(names.at(-1)!, { create: true })
  },
  writeFile: async (
    uri: string,
    contents: string,
    encoding: FileEncoding = 'utf8'
  ): Promise<void> => {
    if (typeof window === 'undefined') return
    const names = parts(uri)
    let data: string | Uint8Array = contents
    if (encoding === 'base64') {
      if (
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contents)
      )
        throw new Error('FileSystem: invalid base64 contents')
      data = Uint8Array.from(atob(contents), (char) => char.charCodeAt(0))
    } else if (encoding !== 'utf8') throw new Error('FileSystem: invalid encoding')
    await write(
      await (await parent(names)).getFileHandle(names.at(-1)!, { create: true }),
      data
    )
  },
  copy: async (from: string, to: string): Promise<void> => {
    if (typeof window !== 'undefined') await transfer(from, to, false)
  },
  move: async (from: string, to: string): Promise<void> => {
    if (typeof window !== 'undefined') await transfer(from, to, true)
  },
  delete: async (uri: string): Promise<void> => {
    if (typeof window === 'undefined') return
    const names = parts(uri)
    if (names.length === 1)
      throw new Error('FileSystem: app root directories are protected')
    await (await parent(names)).removeEntry(names.at(-1)!, { recursive: true })
  },
})

// opfs mutations share the native serial ordering, including queries queued
// behind a write and competing copy destinations.
let tail: Promise<unknown> = Promise.resolve()
function serial<T>(work: () => Promise<T>): Promise<T> {
  const next = tail.then(work)
  tail = next.catch(() => {})
  return next
}
export const FileSystem = Object.freeze({
  getDirectories: operations.getDirectories,
  getInfo: (uri: string) => serial(() => operations.getInfo(uri)),
  readDirectory: (uri: string) => serial(() => operations.readDirectory(uri)),
  makeDirectory: (uri: string, intermediates = true) =>
    serial(() => operations.makeDirectory(uri, intermediates)),
  writeFile: (uri: string, contents: string, encoding: FileEncoding = 'utf8') =>
    serial(() => operations.writeFile(uri, contents, encoding)),
  copy: (from: string, to: string) => serial(() => operations.copy(from, to)),
  move: (from: string, to: string) => serial(() => operations.move(from, to)),
  delete: (uri: string) => serial(() => operations.delete(uri)),
})
