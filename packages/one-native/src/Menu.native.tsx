import { useMemo } from 'react'
import { Platform, View } from 'react-native'
import NativeMenu from './specs/OneNativeMenuNativeComponent'
import { flattenMenuItems } from './menuItems'
import { assertSwiftUIValue } from './generated/swiftui'
import type { MenuProps } from './types'

export function Menu({
  items,
  onAction,
  children,
  onValueChange,
  menuOrder = 'automatic',
  menuActionDismissBehavior = 'automatic',
  disabled = false,
  accessibilityLabel,
  ...props
}: MenuProps) {
  const iosVersion = Number.parseFloat(String(Platform.Version))
  assertSwiftUIValue('MenuOrder', menuOrder, iosVersion)
  assertSwiftUIValue('MenuActionDismissBehavior', menuActionDismissBehavior, iosVersion)
  const nativeItems = useMemo(
    () => flattenMenuItems(items, iosVersion),
    [items, iosVersion]
  )
  if (!onValueChange && nativeItems.some((item) => item.type === 'toggle')) {
    throw new Error('Swift.Menu with toggles requires onValueChange')
  }
  return (
    <NativeMenu
      {...props}
      items={nativeItems}
      menuOrder={menuOrder}
      menuActionDismissBehavior={menuActionDismissBehavior}
      triggerLabel={accessibilityLabel}
      disabled={disabled}
      onAction={({ nativeEvent }) => onAction(nativeEvent.id)}
      onValueChange={({ nativeEvent }) =>
        onValueChange?.(nativeEvent.id, nativeEvent.value, nativeEvent.sourceIndex)
      }
    >
      <View collapsable={false} pointerEvents="none" accessibilityElementsHidden>
        {children}
      </View>
    </NativeMenu>
  )
}
