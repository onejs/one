import { NitroModules } from 'react-native-nitro-modules'
import type { OneStoreReview } from '../specs/OneStoreReview.nitro'

let hybrid: OneStoreReview | undefined

export function storeReviewNative(): OneStoreReview {
  hybrid ??= NitroModules.createHybridObject<OneStoreReview>('OneStoreReview')
  return hybrid
}
