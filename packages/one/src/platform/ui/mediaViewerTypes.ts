import type { ReactNode } from 'react'
import type { PressableProps, StyleProp, ViewStyle } from 'react-native'

export type MediaViewerItem = { id?: string; url: string; title?: string }
export type MediaViewerProps = {
  items: readonly MediaViewerItem[]
  children: ReactNode
  onError?: (message: string) => void
}
export type MediaViewerThumbnailProps = Omit<
  PressableProps,
  'onPress' | 'children' | 'style'
> & {
  index: number
  style?: StyleProp<ViewStyle>
  children: ReactNode
}
