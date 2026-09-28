import type { HybridObject } from 'react-native-nitro-modules'

export interface OneStoreReview extends HybridObject<{ ios: 'swift' }> {
  requestReview(): Promise<void>
}
