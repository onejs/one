import { NativeModules } from 'react-native'
import { missingNativeBuild } from '../nativeError'
import type { ShareTargetDraft } from './types'

export type { ShareTargetDraft, ShareTargetItem, ShareTargetItemKind } from './types'

interface ShareTargetBridge {
  getDrafts(appGroup: string): Promise<ShareTargetDraft[]>
  consumeDraft(
    appGroup: string,
    sessionId: string,
    removeAttachments: boolean
  ): Promise<void>
  discardDraft(appGroup: string, sessionId: string): Promise<void>
}

function bridge(operation: string): ShareTargetBridge {
  const native = NativeModules.OneShareTargetModule as ShareTargetBridge | undefined
  if (!native) throw missingNativeBuild(operation)
  return native
}

function validateAppGroup(appGroup: string): string {
  if (typeof appGroup !== 'string' || !appGroup.trim()) {
    throw new TypeError('ShareTarget requires a non-empty appGroup identifier')
  }
  return appGroup.trim()
}

function validateSessionId(sessionId: string): string {
  if (typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new TypeError('ShareTarget requires a non-empty sessionId')
  }
  return sessionId.trim()
}

export const ShareTarget = Object.freeze({
  getDrafts(appGroup: string): Promise<ShareTargetDraft[]> {
    const group = validateAppGroup(appGroup)
    return Promise.resolve().then(() => bridge('ShareTarget.getDrafts').getDrafts(group))
  },
  consumeDraft(
    appGroup: string,
    sessionId: string,
    options?: { removeAttachments?: boolean }
  ): Promise<void> {
    const group = validateAppGroup(appGroup)
    const id = validateSessionId(sessionId)
    const removeAttachments = options?.removeAttachments ?? false
    return Promise.resolve().then(() =>
      bridge('ShareTarget.consumeDraft').consumeDraft(group, id, removeAttachments)
    )
  },
  discardDraft(appGroup: string, sessionId: string): Promise<void> {
    const group = validateAppGroup(appGroup)
    const id = validateSessionId(sessionId)
    return Promise.resolve().then(() =>
      bridge('ShareTarget.discardDraft').discardDraft(group, id)
    )
  },
})
