import { Platform, requireNativeComponent, type ViewProps } from 'react-native'
import type { MenuActionProps } from './types'

export type { MenuActionProps } from './types'

const isAvailable = Platform.OS === 'ios' && !Platform.isTV

const MenuActionNative = isAvailable
  ? requireNativeComponent<
      ViewProps &
        Omit<MenuActionProps, 'image' | 'onSelected'> & {
          imageSource?: any
          onSelected?: (event: any) => void
        }
    >('VxrnMenuAction')
  : null

export function MenuAction(props: MenuActionProps) {
  if (!MenuActionNative) return null
  const { image, onSelected, ...rest } = props
  return (
    <MenuActionNative
      {...rest}
      imageSource={image}
      onSelected={onSelected ? () => onSelected() : undefined}
    />
  )
}
