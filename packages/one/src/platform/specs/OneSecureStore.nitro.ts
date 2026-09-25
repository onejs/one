import type { HybridObject } from 'react-native-nitro-modules'

// string key-value storage behind One.SecureStore, matching
// expo-secure-store's item api: get, set, and delete by key, with no
// options. a missing key reads undefined, which the js entry maps to null.
export interface OneSecureStore extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getItem(key: string): Promise<string | undefined>
  setItem(key: string, value: string): Promise<void>
  deleteItem(key: string): Promise<void>
}
