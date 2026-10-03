import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneStoreReview } from '../specs/OneStoreReview.nitro'

let hybrid: OneStoreReview | undefined

function requestReview(): Promise<void> {
  if (Platform.OS !== 'ios') throw new Error('StoreReview requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneStoreReview>('OneStoreReview')
  return hybrid.requestReview().catch(rethrowNativeError)
}

export const StoreReview = Object.freeze({ requestReview })
