import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneStorage } from '../specs/OneStorage.nitro'
import { assertStorageKey, assertStorageValue } from './validate'

// native entry: one process-wide store per app, held in memory and appended to
// a memory-mapped log on every write (cpp/HybridOneStorage.cpp, shared by iOS
// and Android). each verb is one jsi call straight into c++.
let hybrid: OneStorage | undefined

function native(): OneStorage {
  return (hybrid ??= NitroModules.createHybridObject<OneStorage>('OneStorage'))
}

function getItem(key: string): string | null {
  assertStorageKey(key, 'Storage.getItem')
  try {
    return native().getItem(key) ?? null
  } catch (error) {
    rethrowNativeError(error)
  }
}

function setItem(key: string, value: string): void {
  assertStorageKey(key, 'Storage.setItem')
  assertStorageValue(value, 'Storage.setItem')
  try {
    native().setItem(key, value)
  } catch (error) {
    rethrowNativeError(error)
  }
}

function removeItem(key: string): void {
  assertStorageKey(key, 'Storage.removeItem')
  try {
    native().removeItem(key)
  } catch (error) {
    rethrowNativeError(error)
  }
}

function getAllKeys(): string[] {
  try {
    return native().getAllKeys()
  } catch (error) {
    rethrowNativeError(error)
  }
}

export const Storage = Object.freeze({ getItem, setItem, removeItem, getAllKeys })
