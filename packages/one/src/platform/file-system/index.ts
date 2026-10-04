import type {
  FileDirectories,
  FileEncoding,
  FileEntry,
  FileInfo,
} from '../specs/OneFileSystem.nitro'

export type { FileDirectories, FileEncoding, FileEntry, FileInfo }

export const FileSystem = Object.freeze({
  getDirectories: (): FileDirectories => ({
    documents: '',
    cache: '',
    applicationSupport: '',
    temporary: '',
  }),
  getInfo: (uri: string): Promise<FileInfo> =>
    Promise.resolve({ uri, exists: false, isDirectory: false }),
  readDirectory: (_uri: string): Promise<FileEntry[]> => Promise.resolve([]),
  makeDirectory: (_uri: string, _intermediates = true): Promise<void> =>
    Promise.resolve(),
  writeFile: (
    _uri: string,
    _contents: string,
    _encoding: FileEncoding = 'utf8'
  ): Promise<void> => Promise.resolve(),
  copy: (_fromUri: string, _toUri: string): Promise<void> => Promise.resolve(),
  move: (_fromUri: string, _toUri: string): Promise<void> => Promise.resolve(),
  delete: (_uri: string): Promise<void> => Promise.resolve(),
})
