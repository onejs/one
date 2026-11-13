import type { shareNative } from './backend'
import { rethrowNativeError } from '../nativeError'
import type { ShareItem, ShareResult } from '../specs/OneShare.nitro'

// required on first use: the ios backend evaluates its framework bindings on load
const native: typeof shareNative = () => require('./backend').shareNative()

export type { ShareItem, ShareItemType, ShareResult } from '../specs/OneShare.nitro'

function share(items: ShareItem[]): Promise<ShareResult> {
  return native().share(items).catch(rethrowNativeError)
}

export const Share = Object.freeze({ share })
