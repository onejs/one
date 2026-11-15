import { shareNative as native } from './backend'
import { rethrowNativeError } from '../nativeError'
import type { ShareItem, ShareResult } from '../specs/OneShare.nitro'

export type { ShareItem, ShareItemType, ShareResult } from '../specs/OneShare.nitro'

function share(items: ShareItem[]): Promise<ShareResult> {
  return native().share(items).catch(rethrowNativeError)
}

export const Share = Object.freeze({ share })
