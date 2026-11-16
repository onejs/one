import type { ReactNode } from 'react'
import type { PressableProps } from 'react-native'

export type MediaViewerItem = { url: string; title?: string }
export type MediaViewerProps = {
  items: readonly MediaViewerItem[]
  children: ReactNode
  onError?: (message: string) => void
}
export type MediaViewerThumbnailProps = Omit<PressableProps, 'onPress' | 'children'> & {
  index: number
  children: ReactNode
}
