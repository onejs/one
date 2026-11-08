import { missingNativeBuild } from '../nativeError'
import type { ShareTargetDraft } from './types'

export type { ShareTargetDraft, ShareTargetItem, ShareTargetSharedFile } from './types'

export const ShareTarget = Object.freeze({
  getDrafts(_appGroup: string): Promise<ShareTargetDraft[]> {
    return Promise.reject(missingNativeBuild('ShareTarget.getDrafts'))
  },
  discardDraft(_appGroup: string, _submissionId: string): Promise<void> {
    return Promise.reject(missingNativeBuild('ShareTarget.discardDraft'))
  },
})
