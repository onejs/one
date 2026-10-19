import { Platform } from 'react-native'
import { storeReviewNative } from './backend'
import { rethrowNativeError } from '../nativeError'
import { StoreReview as unavailableStoreReview } from './unavailable'

function requestReview(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android')
    throw new Error('StoreReview requires a native build')
  return storeReviewNative().requestReview().catch(rethrowNativeError)
}

const nativeStoreReview = Object.freeze({ requestReview })

// iOS reviews through StoreKit and Android through Play In-App Review; other
// platforms keep the unavailable contract
export const StoreReview: typeof nativeStoreReview =
  Platform.OS === 'ios' || Platform.OS === 'android'
    ? nativeStoreReview
    : unavailableStoreReview
