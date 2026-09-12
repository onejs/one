import { useControlled } from './controlled'
import { useMemo } from 'react'
import { Platform, View } from 'react-native'
import NativeMenu from './specs/OneNativeMenuNativeComponent'
import { flattenMenuItems } from './menuItems'
import { assertSwiftUIValue } from './generated/swiftui'
import type { ContextMenuProps, MenuProps } from './types'

export function Menu(props: MenuProps) {
  return <MenuPresentation {...props} presentation="menu" />
}

// the same menu content on SwiftUI's other presentation: long press instead of tap, and the
// trigger keeps its own touches rather than handing them to the menu.
export function ContextMenu(props: ContextMenuProps) {
  return (
    <MenuPresentation
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? ''}
      presentation="contextMenu"
    />
  )
}

function MenuPresentation({
  items,
  onAction,
  children,
  onValueChange,
  revision = 0,
  menuOrder = 'automatic',
  menuActionDismissBehavior = 'automatic',
  disabled = false,
  accessibilityLabel,
  presentation,
  ...props
}: MenuProps & { presentation: string }) {
  const iosVersion = Number.parseFloat(String(Platform.Version))
  assertSwiftUIValue('MenuOrder', menuOrder, iosVersion)
  assertSwiftUIValue('MenuActionDismissBehavior', menuActionDismissBehavior, iosVersion)
  const nativeItems = useMemo(
    () => flattenMenuItems(items, iosVersion),
    [items, iosVersion]
  )
  if (!onValueChange && nativeItems.some((item) => item.type === 'toggle')) {
    const name = presentation === 'contextMenu' ? 'ContextMenu' : 'Menu'
    throw new Error(`Swift.${name} with toggles requires onValueChange`)
  }
  const controlled = useControlled<{
    id: string
    value: boolean
    sourceIndex: number
    eventCount: number
    revision: number
  }>((event) => onValueChange?.(event.id, event.value, event.sourceIndex), revision)
  return (
    <NativeMenu
      {...props}
      items={nativeItems}
      revision={revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      menuOrder={menuOrder}
      menuActionDismissBehavior={menuActionDismissBehavior}
      triggerLabel={accessibilityLabel}
      disabled={disabled}
      presentation={presentation}
      onNativeMenuAction={({ nativeEvent }) => onAction(nativeEvent.id)}
      onNativeMenuValueChange={({ nativeEvent }) =>
        controlled.onNativeChange(nativeEvent)
      }
    >
      <View collapsable={false}>{children}</View>
    </NativeMenu>
  )
}
