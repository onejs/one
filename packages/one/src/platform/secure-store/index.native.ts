import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneSecureStore } from '../specs/OneSecureStore.nitro'
import { assertSecureStoreKey, assertSecureStoreValue } from './validate'

// string key-value storage matching expo-secure-store's item api, backed by
// the OneSecureStore nitro hybrid object (created on first use and cached).
// native owns all behavior; a missing key reads null.
let hybrid: OneSecureStore | undefined

function native(): OneSecureStore {
  hybrid ??= NitroModules.createHybridObject<OneSecureStore>('OneSecureStore')
  return hybrid
}

function getItem(key: string): Promise<string | null> {
  assertSecureStoreKey(key, 'SecureStore.getItem')
  return native()
    .getItem(key)
    .then((value) => value ?? null, rethrowNativeError)
}

function setItem(key: string, value: string): Promise<void> {
  assertSecureStoreKey(key, 'SecureStore.setItem')
  assertSecureStoreValue(value, 'SecureStore.setItem')
  return native().setItem(key, value).catch(rethrowNativeError)
}

function deleteItem(key: string): Promise<void> {
  assertSecureStoreKey(key, 'SecureStore.deleteItem')
  return native().deleteItem(key).catch(rethrowNativeError)
}

// the synchronous verbs block the js thread on the keychain or keystore, as
// expo-secure-store's getItem and setItem do: for values a first render needs
function getItemSync(key: string): string | null {
  assertSecureStoreKey(key, 'SecureStore.getItemSync')
  try {
    return native().getItemSync(key) ?? null
  } catch (error) {
    rethrowNativeError(error)
  }
}

function setItemSync(key: string, value: string): void {
  assertSecureStoreKey(key, 'SecureStore.setItemSync')
  assertSecureStoreValue(value, 'SecureStore.setItemSync')
  try {
    native().setItemSync(key, value)
  } catch (error) {
    rethrowNativeError(error)
  }
}

function deleteItemSync(key: string): void {
  assertSecureStoreKey(key, 'SecureStore.deleteItemSync')
  try {
    native().deleteItemSync(key)
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
