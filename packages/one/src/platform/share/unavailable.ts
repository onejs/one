import { missingNativeBuild } from '../nativeError'
import type { ShareItem, ShareResult } from '../specs/OneShare.nitro'

export type { ShareItem, ShareItemType, ShareResult } from '../specs/OneShare.nitro'

function share(_items: ShareItem[]): Promise<ShareResult> {
  return Promise.reject(missingNativeBuild('Share.share'))
}

export const Share = Object.freeze({ share })
