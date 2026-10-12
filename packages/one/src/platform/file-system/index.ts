import type {
  FileDirectories,
  FileEncoding,
  FileEntry,
  FileInfo,
} from '../specs/OneFileSystem.nitro'
import { Directory, File, FileHandle, FileMode, Paths } from './classes'
import { directories, entry, info, parent, parts, serial, transfer, write } from './opfs'

export type { FileDirectories, FileEncoding, FileEntry, FileInfo }
export type * from './types'

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
  File,
  Directory,
  Paths,
  FileHandle,
  FileMode,
})
