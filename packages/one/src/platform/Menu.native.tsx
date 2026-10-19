import { useControlled } from './controlled'
import { useMemo } from 'react'
import { Platform, View } from 'react-native'
import NativePreview from './specs/OneNativeContextMenuPreviewNativeComponent'
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
  primaryAction,
  children,
  onValueChange,
  onPickerChange,
  revision = 0,
  menuOrder = 'automatic',
  menuActionDismissBehavior = 'automatic',
  disabled = false,
  accessibilityLabel,
  presentation,
  preview,
  previewWidth,
  previewHeight,
  ...props
}: MenuProps & {
  presentation: string
  preview?: ContextMenuProps['preview']
  previewWidth?: number
  previewHeight?: number
}) {
  const iosVersion = Number.parseFloat(String(Platform.Version))
  assertSwiftUIValue('MenuOrder', menuOrder, iosVersion)
  assertSwiftUIValue('MenuActionDismissBehavior', menuActionDismissBehavior, iosVersion)
  // a tap menu has no preview; only a context menu lifts one above its items.
  if (presentation === 'menu' && preview != null)
    throw new Error('Swift.Menu takes no preview; use Swift.ContextMenu')
  // UIKit sizes the preview from its controller, and a React Native subtree has
  // no ideal size, so the box travels with the preview like a popover's.
  if (preview != null) {
    if (!Number.isFinite(previewWidth) || (previewWidth as number) <= 0)
      throw new Error('Swift.ContextMenu previewWidth must be a positive number')
    if (!Number.isFinite(previewHeight) || (previewHeight as number) <= 0)
      throw new Error('Swift.ContextMenu previewHeight must be a positive number')
  } else if (previewWidth !== undefined || previewHeight !== undefined) {
    throw new Error('Swift.ContextMenu previewWidth and previewHeight need a preview')
  }
  const nativeItems = useMemo(
    () => flattenMenuItems(items, iosVersion),
    [items, iosVersion]
  )
  if (!onValueChange && nativeItems.some((item) => item.type === 'toggle')) {
    const name = presentation === 'contextMenu' ? 'ContextMenu' : 'Menu'
    throw new Error(`Swift.${name} with toggles requires onValueChange`)
  }
  if (!onPickerChange && nativeItems.some((item) => item.type === 'picker')) {
    throw new Error('Swift.Menu with a Picker requires onPickerChange')
  }
  const controlled = useControlled<{
    id: string
    value: boolean
    sourceIndex: number
    eventCount: number
    revision: number
  }>((event) => onValueChange?.(event.id, event.value, event.sourceIndex), revision)
  const pickerControlled = useControlled<{
    id: string
    value: string
    eventCount: number
    revision: number
  }>((event) => onPickerChange?.(event.id, event.value), revision)
  return (
    <NativeMenu
      {...props}
      items={nativeItems}
      revision={revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      pickerAcknowledgedEvent={pickerControlled.acknowledgedEvent}
      menuOrder={menuOrder}
      menuActionDismissBehavior={menuActionDismissBehavior}
      triggerLabel={accessibilityLabel}
      disabled={disabled}
      hasPrimaryAction={presentation === 'menu' && !!primaryAction}
      presentation={presentation}
      previewWidth={previewWidth ?? 0}
      previewHeight={previewHeight ?? 0}
      onNativeMenuAction={({ nativeEvent }) => onAction(nativeEvent.id)}
      onNativeMenuPrimaryAction={() => primaryAction?.()}
      onNativeMenuValueChange={({ nativeEvent }) =>
        controlled.onNativeChange(nativeEvent)
      }
      onNativeMenuPickerChange={({ nativeEvent }) =>
        pickerControlled.onNativeChange(nativeEvent)
      }
    >
      <View collapsable={false}>{children}</View>
      {preview != null && (
        <NativePreview
          collapsable={false}
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          {preview}
        </NativePreview>
      )}
    </NativeMenu>
  )
}
