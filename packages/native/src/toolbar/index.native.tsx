import { requireNativeComponent, type ViewProps } from 'react-native'

import type { ToolbarHostProps, ToolbarItemProps } from './types'

export type { ToolbarHostProps, ToolbarItemProps, BasicTextStyle } from './types'

const ToolbarHostNative = requireNativeComponent<
  ViewProps & { children?: React.ReactNode }
>('VxrnToolbarHost')

export function ToolbarHost(props: ToolbarHostProps) {
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

const ToolbarItemNative: React.ComponentType<any> =
  requireNativeComponent('VxrnToolbarItem')

export function ToolbarItem(props: ToolbarItemProps) {
  const { image, onSelected, ...rest } = props
  return (
    <ToolbarItemNative
      {...rest}
      imageSource={image}
      onSelected={onSelected ? () => onSelected() : undefined}
    />
  )
}
