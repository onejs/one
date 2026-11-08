export type ShareTargetItemKind = 'text' | 'url' | 'image' | 'video' | 'audio' | 'file'

export interface ShareTargetItem {
  id: string
  kind: ShareTargetItemKind
  typeIdentifier: string
  mimeType: string | null
  suggestedName: string | null
  text: string | null
  url: string | null
  fileUri: string | null
  byteSize: number | null
}

export interface ShareTargetDraft {
  sessionId: string
  createdAt: number
  targetRoute: string | null
  sourceBundleId: string | null
  items: ShareTargetItem[]
}
