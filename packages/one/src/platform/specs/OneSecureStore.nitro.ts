import type { HybridObject } from 'react-native-nitro-modules'
import type { SecureStoreOptions } from '../secure-store/types'

export type { SecureStoreOptions }

// string key-value storage behind One.SecureStore, matching
// expo-secure-store's item api with its options: keychain service,
// accessibility, per-item authentication and its prompt, and the ios access
// group. each verb also synchronous as expo's getItem and setItem are. a
// missing key reads undefined, which the js entry maps to null.
export interface OneSecureStore extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getItem(key: string, options: SecureStoreOptions): Promise<string | undefined>
  setItem(key: string, value: string, options: SecureStoreOptions): Promise<void>
  deleteItem(key: string, options: SecureStoreOptions): Promise<void>
  getItemSync(key: string, options: SecureStoreOptions): string | undefined
  setItemSync(key: string, value: string, options: SecureStoreOptions): void
  deleteItemSync(key: string, options: SecureStoreOptions): void
}
