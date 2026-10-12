import type { FileEncoding } from '../specs/OneFileSystem.nitro'

// file, directory, paths and handle shapes behind One.FileSystem, mirroring
// expo-file-system. FileMode and the option bags keep expo's names; the info
// results are FileStat and DirectoryStat because FileSystem.getInfo already
// owns FileInfo.

export const FileMode = Object.freeze({
  ReadWrite: 'rw',
  ReadOnly: 'r',
  WriteOnly: 'w',
  Append: 'wa',
  Truncate: 'wt',
} as const)

export type FileMode = (typeof FileMode)[keyof typeof FileMode]

export type FileCreateOptions = {
  intermediates?: boolean
  overwrite?: boolean
}

export type DirectoryCreateOptions = {
  intermediates?: boolean
  overwrite?: boolean
  idempotent?: boolean
}

export type RelocationOptions = {
  overwrite?: boolean
}

export type FileWriteOptions = {
  encoding?: FileEncoding
  append?: boolean
}

export type FileDigestAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

export type FileStat = {
  exists: boolean
  uri?: string
  size?: number
  modificationTime?: number
  creationTime?: number
}

export type DirectoryStat = {
  exists: boolean
  uri?: string
  size?: number
  modificationTime?: number
  creationTime?: number
  files?: string[]
}

export type PathInfo = {
  exists: boolean
  isDirectory: boolean | null
}

export type ParsedPath = {
  root: string
  dir: string
  base: string
  ext: string
  name: string
}
