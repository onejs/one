import { NativeModules } from 'react-native'
import { missingNativeBuild } from '../nativeError'
import type { ShareTargetDraft } from './types'

export type { ShareTargetDraft, ShareTargetItem, ShareTargetSharedFile } from './types'

interface ShareTargetBridge {
  getDrafts(appGroup: string): Promise<ShareTargetDraft[]>
  discardDraft(appGroup: string, submissionId: string): Promise<void>
}

function bridge(operation: string): ShareTargetBridge {
  const native = NativeModules.OneShareTargetModule as ShareTargetBridge | undefined
  if (!native) throw missingNativeBuild(operation)
  return native
}

export const ShareTarget = Object.freeze({
  getDrafts(appGroup: string): Promise<ShareTargetDraft[]> {
    return bridge('ShareTarget.getDrafts').getDrafts(appGroup)
  },
  discardDraft(appGroup: string, submissionId: string): Promise<void> {
    return bridge('ShareTarget.discardDraft').discardDraft(appGroup, submissionId)
  },
})
