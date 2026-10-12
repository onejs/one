import type { HybridObject } from 'react-native-nitro-modules'

export type ShareItemType = 'text' | 'url' | 'file'

export interface ShareItem {
  type: ShareItemType
  value: string
}

export interface ShareResult {
  completed: boolean
  activityType?: string
}

export interface OneShare extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  share(items: ShareItem[]): Promise<ShareResult>
}
