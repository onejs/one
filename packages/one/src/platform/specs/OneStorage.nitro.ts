import type { HybridObject } from 'react-native-nitro-modules'

// one c++ engine serves both platforms, so calls never cross into swift or the
// jvm and the log format has a single implementation.

export interface OneStorage extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  getItem(key: string): string | undefined
  setItem(key: string, value: string): void
  removeItem(key: string): void
  getAllKeys(): string[]
}
