import { rethrowNativeError } from '../nativeError'
import type {
  FileDirectories,
  FileEncoding,
  FileEntry,
  FileInfo,
} from '../specs/OneFileSystem.nitro'
import { Directory, File, FileHandle, FileMode, Paths } from './classes.native'
import { fileSystemNative as native } from './hybrid.native'

export type { FileDirectories, FileEncoding, FileEntry, FileInfo }
export type * from './types'

function getDirectories(): FileDirectories {
  try {
    return native().getDirectories()
  } catch (error) {
    return rethrowNativeError(error)
  }
}

function getInfo(uri: string): Promise<FileInfo> {
  return native().getInfo(uri).catch(rethrowNativeError)
}

function readDirectory(uri: string): Promise<FileEntry[]> {
  return native().readDirectory(uri).catch(rethrowNativeError)
}

function makeDirectory(uri: string, intermediates = true): Promise<void> {
  return native().makeDirectory(uri, intermediates).catch(rethrowNativeError)
}

function writeFile(
  uri: string,
  contents: string,
  encoding: FileEncoding = 'utf8'
): Promise<void> {
  return native().writeFile(uri, contents, encoding).catch(rethrowNativeError)
}

function copy(fromUri: string, toUri: string): Promise<void> {
  return native().copy(fromUri, toUri).catch(rethrowNativeError)
}

function move(fromUri: string, toUri: string): Promise<void> {
  return native().move(fromUri, toUri).catch(rethrowNativeError)
}

function deleteFile(uri: string): Promise<void> {
  return native().remove(uri).catch(rethrowNativeError)
}

export const FileSystem = Object.freeze({
  getDirectories,
  getInfo,
  readDirectory,
  makeDirectory,
  writeFile,
  copy,
  move,
  delete: deleteFile,
  File,
  Directory,
  Paths,
  FileHandle,
  FileMode,
})
