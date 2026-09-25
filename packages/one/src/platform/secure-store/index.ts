import { assertSecureStoreKey, assertSecureStoreValue } from './validate'

// web entry. secure storage has no honest web equivalent: anything kept in
// localStorage or a cookie persists in cleartext, so every verb rejects
// instead of faking it. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms.
function getItem(key: string): Promise<string | null> {
  assertSecureStoreKey(key, 'SecureStore.getItem')
  return Promise.reject(new Error('SecureStore.getItem needs an iOS or Android build'))
}

function setItem(key: string, value: string): Promise<void> {
  assertSecureStoreKey(key, 'SecureStore.setItem')
  assertSecureStoreValue(value, 'SecureStore.setItem')
  return Promise.reject(new Error('SecureStore.setItem needs an iOS or Android build'))
}

function deleteItem(key: string): Promise<void> {
  assertSecureStoreKey(key, 'SecureStore.deleteItem')
  return Promise.reject(new Error('SecureStore.deleteItem needs an iOS or Android build'))
}

export const SecureStore = Object.freeze({ getItem, setItem, deleteItem })
