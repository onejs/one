import { useRef, type ComponentRef } from 'react'
import {
  findNodeHandle,
  Pressable,
  requireNativeComponent,
  TurboModuleRegistry,
  View,
  type ViewProps,
} from 'react-native'
import { flattenMenuItems } from './menuItems'
import type { NativeMenuItem } from './specs/OneNativeMenuNativeComponent'
import type { ContextMenuProps, MenuProps } from './types'
import type { TurboModule } from 'react-native'

const NativeContextTrigger = requireNativeComponent<
  ViewProps & {
    contextMenuEnabled: boolean
    onNativeMenuLongPress: () => void
  }
>('OneNativeMenuTrigger')

type Selection = {
  type: 'action' | 'toggle'
  id: string
  value: boolean
  sourceIndex: number
}

interface MenuPopupSpec extends TurboModule {
  show(anchorTag: number, items: NativeMenuItem[]): Promise<Selection | null>
}

let popupModule: MenuPopupSpec | null | undefined

function popup(): MenuPopupSpec {
  if (popupModule === undefined) {
    popupModule = TurboModuleRegistry.get<MenuPopupSpec>('OneNativeMenuPopup')
  }
  if (!popupModule) {
    throw new Error('Menu needs an Android build')
  }
  return popupModule
}

function MenuPresentation({
  items,
  onAction,
  onValueChange,
  onPickerChange: _onPickerChange,
  primaryAction: _primaryAction,
  children,
  disabled = false,
  revision: _revision,
  menuOrder: _menuOrder,
  menuActionDismissBehavior: _menuActionDismissBehavior,
  presentation,
  ...viewProps
}: MenuProps & { presentation: 'menu' | 'contextMenu' }) {
  const anchor = useRef<View>(null)
  const contextAnchor = useRef<ComponentRef<typeof NativeContextTrigger>>(null)
  const nativeItems = flattenMenuItems(items)
  if (nativeItems.some((item) => item.type === 'picker')) {
    throw new Error('Menu picker items are not supported on Android')
  }
  if (!onValueChange && nativeItems.some((item) => item.type === 'toggle')) {
    throw new Error('Menu with toggles requires onValueChange')
  }

  const open = async () => {
    if (disabled) return
    const anchorTag = findNodeHandle(
      presentation === 'contextMenu' ? contextAnchor.current : anchor.current
    )
    if (anchorTag == null) throw new Error('Menu trigger has no native view')
    const selection = await popup().show(anchorTag, nativeItems)
    if (selection?.type === 'action') onAction(selection.id)
    if (selection?.type === 'toggle') {
      onValueChange?.(selection.id, selection.value, selection.sourceIndex)
    }
  }

  if (presentation === 'contextMenu') {
    return (
      <NativeContextTrigger
        ref={contextAnchor}
        collapsable={false}
        {...viewProps}
        contextMenuEnabled={!disabled}
        onNativeMenuLongPress={open}
      >
        {children}
      </NativeContextTrigger>
    )
  }

  return (
    <Pressable disabled={disabled} onPress={open}>
      <View ref={anchor} collapsable={false} {...viewProps}>
        {children}
      </View>
    </Pressable>
  )
}

export function Menu(props: MenuProps) {
  return <MenuPresentation {...props} presentation="menu" />
}

export function ContextMenu(props: ContextMenuProps) {
  return (
    <MenuPresentation
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? ''}
      presentation="contextMenu"
    />
  )
}
