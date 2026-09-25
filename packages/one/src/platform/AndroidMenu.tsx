import { useRef } from 'react'
import { findNodeHandle, Pressable, TurboModuleRegistry, View } from 'react-native'
import { flattenMenuItems } from './menuItems'
import type { NativeMenuItem } from './specs/OneNativeMenuNativeComponent'
import type { ContextMenuProps, MenuProps } from './types'
import type { TurboModule } from 'react-native'

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
  children,
  disabled = false,
  revision: _revision,
  menuOrder: _menuOrder,
  menuActionDismissBehavior: _menuActionDismissBehavior,
  presentation,
  ...viewProps
}: MenuProps & { presentation: 'menu' | 'contextMenu' }) {
  const anchor = useRef<View>(null)
  const nativeItems = flattenMenuItems(items)
  if (!onValueChange && nativeItems.some((item) => item.type === 'toggle')) {
    throw new Error('Menu with toggles requires onValueChange')
  }

  const open = async () => {
    if (disabled) return
    const anchorTag = findNodeHandle(anchor.current)
    if (anchorTag == null) throw new Error('Menu trigger has no native view')
    const selection = await popup().show(anchorTag, nativeItems)
    if (selection?.type === 'action') onAction(selection.id)
    if (selection?.type === 'toggle') {
      onValueChange?.(selection.id, selection.value, selection.sourceIndex)
    }
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={presentation === 'menu' ? open : undefined}
      onLongPress={presentation === 'contextMenu' ? open : undefined}
    >
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
