import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneSecureStore } from '../specs/OneSecureStore.nitro'
import type { SecureStoreOptions } from './types'
import {
  assertSecureStoreKey,
  assertSecureStoreOptions,
  assertSecureStoreValue,
} from './validate'

export type { SecureStoreAccessibility, SecureStoreOptions } from './types'

// string key-value storage matching expo-secure-store's item api, backed by
// the OneSecureStore nitro hybrid object (created on first use and cached).
// native owns all behavior; a missing key reads null.
let hybrid: OneSecureStore | undefined

function native(): OneSecureStore {
  hybrid ??= NitroModules.createHybridObject<OneSecureStore>('OneSecureStore')
  return hybrid
}

function getItem(key: string, options?: SecureStoreOptions): Promise<string | null> {
  assertSecureStoreKey(key, 'SecureStore.getItem')
  const checked = assertSecureStoreOptions(options, 'SecureStore.getItem')
  return native()
    .getItem(key, checked)
    .then((value) => value ?? null, rethrowNativeError)
}

function setItem(key: string, value: string, options?: SecureStoreOptions): Promise<void> {
  assertSecureStoreKey(key, 'SecureStore.setItem')
  assertSecureStoreValue(value, 'SecureStore.setItem')
  const checked = assertSecureStoreOptions(options, 'SecureStore.setItem')
  return native().setItem(key, value, checked).catch(rethrowNativeError)
}

function deleteItem(key: string, options?: SecureStoreOptions): Promise<void> {
  assertSecureStoreKey(key, 'SecureStore.deleteItem')
  const checked = assertSecureStoreOptions(options, 'SecureStore.deleteItem')
  return native().deleteItem(key, checked).catch(rethrowNativeError)
}

// the synchronous verbs block the js thread on the keychain or keystore, as
// expo-secure-store's getItem and setItem do: for values a first render needs
function getItemSync(key: string, options?: SecureStoreOptions): string | null {
  assertSecureStoreKey(key, 'SecureStore.getItemSync')
  const checked = assertSecureStoreOptions(options, 'SecureStore.getItemSync')
  try {
    return native().getItemSync(key, checked) ?? null
  } catch (error) {
    rethrowNativeError(error)
  }
}

function setItemSync(key: string, value: string, options?: SecureStoreOptions): void {
  assertSecureStoreKey(key, 'SecureStore.setItemSync')
  assertSecureStoreValue(value, 'SecureStore.setItemSync')
  const checked = assertSecureStoreOptions(options, 'SecureStore.setItemSync')
  try {
    native().setItemSync(key, value, checked)
  } catch (error) {
    rethrowNativeError(error)
  }
}

function deleteItemSync(key: string, options?: SecureStoreOptions): void {
  assertSecureStoreKey(key, 'SecureStore.deleteItemSync')
  const checked = assertSecureStoreOptions(options, 'SecureStore.deleteItemSync')
  try {
    native().deleteItemSync(key, checked)
  } catch (error) {
    rethrowNativeError(error)
  }
}

export const SecureStore = Object.freeze({
  getItem,
  setItem,
  deleteItem,
  getItemSync,
  setItemSync,
  deleteItemSync,
})
