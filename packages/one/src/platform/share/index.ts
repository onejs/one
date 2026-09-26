import type { ShareItem, ShareResult } from '../specs/OneShare.nitro'

export type { ShareItem, ShareItemType, ShareResult } from '../specs/OneShare.nitro'

function share(_items: ShareItem[]): Promise<ShareResult> {
  throw new Error('Share requires an iOS native build')
}

export const Share = Object.freeze({ share })
