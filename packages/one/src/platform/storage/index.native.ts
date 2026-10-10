import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneStorage } from '../specs/OneStorage.nitro'
import { invalidKey, invalidValue } from './validate'

// native entry: one process-wide store per app, held in memory and appended to
// a memory-mapped log on every write (cpp/HybridOneStorage.cpp, shared by iOS
// and Android). each verb is one jsi call straight into c++, and everything
// around it is inline, since any extra js call per verb shows up against the
// fastest native stores.
let hybrid: OneStorage | undefined

function getItem(key: string): string | null {
  if (typeof key !== 'string' || key === '') invalidKey('Storage.getItem')
  try {
    return (
      (hybrid ??= NitroModules.createHybridObject<OneStorage>('OneStorage')).getItem(
        key
      ) ?? null
    )
  } catch (error) {
    rethrowNativeError(error)
  }
}

function setItem(key: string, value: string): void {
  if (typeof key !== 'string' || key === '') invalidKey('Storage.setItem')
  if (typeof value !== 'string') invalidValue('Storage.setItem')
  try {
    ;(hybrid ??= NitroModules.createHybridObject<OneStorage>('OneStorage')).setItem(
      key,
      value
    )
  } catch (error) {
    rethrowNativeError(error)
  }
}

function removeItem(key: string): void {
  if (typeof key !== 'string' || key === '') invalidKey('Storage.removeItem')
  try {
    ;(hybrid ??= NitroModules.createHybridObject<OneStorage>('OneStorage')).removeItem(
      key
    )
  } catch (error) {
    rethrowNativeError(error)
  }
}

function getAllKeys(): string[] {
  try {
    return (hybrid ??=
      NitroModules.createHybridObject<OneStorage>('OneStorage')).getAllKeys()
  } catch (error) {
    rethrowNativeError(error)
  }
}

export const Storage = Object.freeze({ getItem, setItem, removeItem, getAllKeys })
