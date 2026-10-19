import type { HybridObject } from 'react-native-nitro-modules'

export interface OneStoreReview extends HybridObject<{ android: 'kotlin' }> {
  requestReview(): Promise<void>
}
