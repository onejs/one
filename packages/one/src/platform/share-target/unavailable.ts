import type { ShareTargetDraft } from './types'

export type { ShareTargetDraft, ShareTargetItem, ShareTargetItemKind } from './types'

export const ShareTarget = Object.freeze({
  getDrafts(_appGroup: string): Promise<ShareTargetDraft[]> {
    return Promise.resolve([])
  },
  consumeDraft(
    _appGroup: string,
    _sessionId: string,
    _options?: { removeAttachments?: boolean }
  ): Promise<void> {
    return Promise.resolve()
  },
  discardDraft(_appGroup: string, _sessionId: string): Promise<void> {
    return Promise.resolve()
  },
})
