import { useMemo } from 'react'
import { View } from 'react-native'
import NativeMenu from './specs/OneNativeMenuNativeComponent'
import { flattenMenuItems } from './menuItems'
import type { MenuProps } from './types'

export function Menu({
  items,
  onAction,
  children,
  title = '',
  disabled = false,
  accessibilityLabel,
  ...props
}: MenuProps) {
  const nativeItems = useMemo(() => flattenMenuItems(items), [items])
  return (
    <NativeMenu
      {...props}
      items={nativeItems}
      menuTitle={title}
      triggerLabel={accessibilityLabel}
      disabled={disabled}
      onAction={({ nativeEvent }) => onAction(nativeEvent.id)}
    >
      <View collapsable={false} pointerEvents="none" accessibilityElementsHidden>
        {children}
      </View>
    </NativeMenu>
  )
}
