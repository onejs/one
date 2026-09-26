import type {
  FileDirectories,
  FileEncoding,
  FileEntry,
  FileInfo,
} from '../specs/OneFileSystem.nitro'

export type { FileDirectories, FileEncoding, FileEntry, FileInfo }

function unavailable(): never {
  throw new Error('FileSystem requires an iOS native build')
}

export const FileSystem = Object.freeze({
  getDirectories: (): FileDirectories => unavailable(),
  getInfo: (_uri: string): Promise<FileInfo> => unavailable(),
  readDirectory: (_uri: string): Promise<FileEntry[]> => unavailable(),
  makeDirectory: (_uri: string, _intermediates = true): Promise<void> => unavailable(),
  writeFile: (_uri: string, _contents: string, _encoding: FileEncoding = 'utf8'): Promise<void> =>
    unavailable(),
  copy: (_fromUri: string, _toUri: string): Promise<void> => unavailable(),
  move: (_fromUri: string, _toUri: string): Promise<void> => unavailable(),
  delete: (_uri: string): Promise<void> => unavailable(),
})
