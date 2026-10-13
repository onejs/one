import { Platform, requireNativeComponent, type ViewProps } from 'react-native'

import type { ToolbarHostProps, ToolbarItemProps } from './types'

export type { ToolbarHostProps, ToolbarItemProps, BasicTextStyle } from './types'

// the toolbar views exist only on ios, so android renders nothing, like
// MenuAction and the zoom transition views.
const isAvailable = Platform.OS === 'ios' && !Platform.isTV

const ToolbarHostNative = isAvailable
  ? requireNativeComponent<ViewProps & { children?: React.ReactNode }>('OneToolbarHost')
  : null

export function ToolbarHost(props: ToolbarHostProps) {
  if (!ToolbarHostNative) return null
  return (
    <ToolbarHostNative
      {...props}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        backgroundColor: 'transparent',
      }}
    />
  )
}

const ToolbarItemNative: React.ComponentType<any> | null = isAvailable
  ? requireNativeComponent('OneToolbarItem')
  : null

export function ToolbarItem(props: ToolbarItemProps) {
  if (!ToolbarItemNative) return null
  const { image, onSelected, ...rest } = props
  return (
    <ToolbarItemNative
      {...rest}
      imageSource={image}
      onSelected={onSelected ? () => onSelected() : undefined}
    />
  )
}
