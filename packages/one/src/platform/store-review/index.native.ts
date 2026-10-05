import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneStoreReview } from '../specs/OneStoreReview.nitro'
import { StoreReview as unavailableStoreReview } from './unavailable'

let hybrid: OneStoreReview | undefined

function requestReview(): Promise<void> {
  if (Platform.OS !== 'ios') throw new Error('StoreReview requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneStoreReview>('OneStoreReview')
  return hybrid.requestReview().catch(rethrowNativeError)
}

const nativeStoreReview = Object.freeze({ requestReview })

// SKStoreReviewController is iOS only, so Android keeps the unavailable contract
export const StoreReview: typeof nativeStoreReview =
  Platform.OS === 'android' ? unavailableStoreReview : nativeStoreReview
