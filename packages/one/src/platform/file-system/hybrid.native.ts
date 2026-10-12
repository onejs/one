import { NitroModules } from 'react-native-nitro-modules'
import type { OneFileSystem } from '../specs/OneFileSystem.nitro'

// one cached hybrid shared by the flat functions and the File, Directory,
// Paths and FileHandle classes, so open handles resolve on every entry.
let hybrid: OneFileSystem | undefined

export function fileSystemNative(): OneFileSystem {
  hybrid ??= NitroModules.createHybridObject<OneFileSystem>('OneFileSystem')
  return hybrid
}
