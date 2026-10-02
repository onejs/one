import type { HybridObject } from 'react-native-nitro-modules'

export interface OneStorage extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getItem(key: string): string | undefined
  setItem(key: string, value: string): void
  removeItem(key: string): void
  getAllKeys(): string[]
}
