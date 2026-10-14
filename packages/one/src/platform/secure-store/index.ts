import type { SecureStoreOptions } from './types'
import {
  assertSecureStoreKey,
  assertSecureStoreOptions,
  assertSecureStoreValue,
} from './validate'

export type { SecureStoreAccessibility, SecureStoreOptions } from './types'

// web entry. secure storage has no honest web equivalent: anything kept in
// localStorage or a cookie persists in cleartext, so every verb rejects
// instead of faking it. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms.
function getItem(key: string, options?: SecureStoreOptions): Promise<string | null> {
  assertSecureStoreKey(key, 'SecureStore.getItem')
  assertSecureStoreOptions(options, 'SecureStore.getItem')
  return Promise.reject(new Error('SecureStore.getItem needs an iOS or Android build'))
}

function setItem(key: string, value: string, options?: SecureStoreOptions): Promise<void> {
  assertSecureStoreKey(key, 'SecureStore.setItem')
  assertSecureStoreValue(value, 'SecureStore.setItem')
  assertSecureStoreOptions(options, 'SecureStore.setItem')
  return Promise.reject(new Error('SecureStore.setItem needs an iOS or Android build'))
}

function deleteItem(key: string, options?: SecureStoreOptions): Promise<void> {
  assertSecureStoreKey(key, 'SecureStore.deleteItem')
  assertSecureStoreOptions(options, 'SecureStore.deleteItem')
  return Promise.reject(new Error('SecureStore.deleteItem needs an iOS or Android build'))
}

function getItemSync(key: string, options?: SecureStoreOptions): string | null {
  assertSecureStoreKey(key, 'SecureStore.getItemSync')
  assertSecureStoreOptions(options, 'SecureStore.getItemSync')
  throw new Error('SecureStore.getItemSync needs an iOS or Android build')
}

function setItemSync(key: string, value: string, options?: SecureStoreOptions): void {
  assertSecureStoreKey(key, 'SecureStore.setItemSync')
  assertSecureStoreValue(value, 'SecureStore.setItemSync')
  assertSecureStoreOptions(options, 'SecureStore.setItemSync')
  throw new Error('SecureStore.setItemSync needs an iOS or Android build')
}

function deleteItemSync(key: string, options?: SecureStoreOptions): void {
  assertSecureStoreKey(key, 'SecureStore.deleteItemSync')
  assertSecureStoreOptions(options, 'SecureStore.deleteItemSync')
  throw new Error('SecureStore.deleteItemSync needs an iOS or Android build')
}

export const SecureStore = Object.freeze({
  getItem,
  setItem,
  deleteItem,
  getItemSync,
  setItemSync,
  deleteItemSync,
})
