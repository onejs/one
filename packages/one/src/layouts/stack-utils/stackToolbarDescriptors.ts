import type { ColorValue } from 'react-native'
import type {
  NativeStackHeaderItem,
  NativeStackHeaderItemMenuAction,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'

/**
 * Declarative toolbar placement. Leading/trailing are direction-aware and
 * follow the native cross-direction contract (SwiftUI topBarLeading /
 * topBarTrailing, UIKit mirrored left/right). Bottom is the retained
 * navigation-controller toolbar capability.
 */
export type StackToolbarPlacement = 'leading' | 'trailing' | 'bottom'

export interface StackToolbarItemProps {
  children?: ReactNode
  identifier?: string
  title?: string
  /**
   * Secondary text for menu actions. Maps to the header menu action
   * description and has no slot on top-level buttons.
   */
  description?: string
  /**
   * iOS SF Symbol name. Header items map this to `{ type: 'sfSymbol', name }`;
   * bottom items map it to the toolbar item system image. No new Icon
   * contract is introduced here on purpose.
   */
  systemImageName?: string
  /**
   * Passed through untouched wherever the underlying item accepts it,
   * including platform dynamic iOS values.
   */
  tintColor?: ColorValue
  disabled?: boolean
  /**
   * Liquid-glass background sharing (iOS 26+). Passed to header items and
   * bottom toolbar items alike.
   */
  sharesBackground?: boolean
  hidesSharedBackground?: boolean
  /**
   * Top-level header items have no hidden slot in react-navigation, so hidden
   * leading/trailing items are omitted. Bottom items pass hidden through to
   * the toolbar item.
   */
  hidden?: boolean
  /**
   * Selected state. Maps to the header button/menu-action state and the
   * toolbar item selected flag.
   */
  selected?: boolean
  /**
   * Menu-only. There is no destructive slot on top-level bar buttons, so a
   * top-level destructive item keeps its button behavior without destructive
   * styling.
   */
  destructive?: boolean
  accessibilityLabel?: string
  accessibilityHint?: string
  onPress?: () => void
  /** Alias of onPress, matching the ToolbarItem/MenuAction naming. */
  onSelected?: () => void
}

export interface StackToolbarMenuProps {
  children?: ReactNode
  identifier?: string
  title: string
  /** Bar-button label. Defaults to title when the menu sits in a bar. */
  label?: string
  systemImageName?: string
  tintColor?: ColorValue
  disabled?: boolean
  /** Liquid-glass background sharing (iOS 26+). */
  sharesBackground?: boolean
  hidesSharedBackground?: boolean
  hidden?: boolean
  accessibilityLabel?: string
  accessibilityHint?: string
}

export interface StackToolbarProps {
  children?: ReactNode
}

export interface StackToolbarSlotProps {
  children?: ReactNode
}

export interface StackToolbarBottomProps {
  children?: ReactNode
  hidden?: boolean
  animated?: boolean
}

/** Marker set on toolbar compound components to identify slots/leaf nodes. */
export const TOOLBAR_KIND = '__oneStackToolbarKind' as const

export type StackToolbarKind = 'toolbar' | 'leading' | 'trailing' | 'bottom' | 'item' | 'menu'

function kindOf(element: ReactNode): StackToolbarKind | undefined {
  if (!isValidElement(element)) return undefined
  return (element.type as { [TOOLBAR_KIND]?: StackToolbarKind })?.[TOOLBAR_KIND]
}

function isKind(element: ReactNode, kind: StackToolbarKind): boolean {
  return kindOf(element) === kind
}

export function resolveToolbarHandler(props: StackToolbarItemProps): () => void {
  return props.onPress ?? props.onSelected ?? (() => {})
}

function fallbackIdentifier(slot: string, index: number, title?: string): string {
  const slug = (title ?? 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24) || 'item'
  return `stack-toolbar-${slot}-${slug}-${index}`
}

type HeaderIcon = NonNullable<NativeStackHeaderItemMenuAction['icon']>

function headerIcon(systemImageName?: string): HeaderIcon | undefined {
  return systemImageName
    ? ({ type: 'sfSymbol', name: systemImageName } as HeaderIcon)
    : undefined
}

function warn(message: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(message)
  }
}

/** Safe display name for any child type, including fragments and host tags. */
function childName(child: ReactNode): string {
  if (!isValidElement(child)) return 'unknown'
  const type = child.type as { name?: string } | string | symbol
  if (typeof type === 'string') return type
  if (typeof type === 'symbol') return 'Fragment'
  return type?.name ?? 'unknown'
}

/**
 * Convert one Item descriptor to a header button. Returns null for hidden
 * items (no hidden slot on header buttons) and for items with neither title
 * nor icon (nothing renderable).
 */
export function itemPropsToHeaderButton(
  props: StackToolbarItemProps,
  index: number,
  slot: 'leading' | 'trailing'
): NativeStackHeaderItem | null {
  if (props.hidden) return null
  if (!props.title && !props.systemImageName) {
    warn(
      `Warning: Stack.Toolbar item in ${slot} needs a title or systemImageName and was skipped.`
    )
    return null
  }
  return {
    type: 'button',
    label: props.title ?? props.accessibilityLabel ?? `Toolbar item ${index + 1}`,
    ...(headerIcon(props.systemImageName) && { icon: headerIcon(props.systemImageName) }),
    ...(props.tintColor !== undefined && { tintColor: props.tintColor }),
    ...(props.disabled && { disabled: true }),
    ...(props.selected && { selected: true }),
    ...(props.sharesBackground !== undefined && {
      sharesBackground: props.sharesBackground,
    }),
    ...(props.hidesSharedBackground !== undefined && {
      hidesSharedBackground: props.hidesSharedBackground,
    }),
    ...(props.identifier
      ? { identifier: props.identifier }
      : { identifier: fallbackIdentifier(slot, index, props.title) }),
    ...(props.accessibilityLabel && { accessibilityLabel: props.accessibilityLabel }),
    ...(props.accessibilityHint && { accessibilityHint: props.accessibilityHint }),
    onPress: resolveToolbarHandler(props),
  } as NativeStackHeaderItem
}

function itemElementToMenuAction(
  element: ReactNode,
  index: number,
  slot: string
): NativeStackHeaderItemMenuAction | null {
  if (!isValidElement(element)) return null
  const props = element.props as StackToolbarItemProps
  if (props.hidden) return null
  if (!props.title && !props.systemImageName) {
    warn(
      `Warning: Stack.Toolbar menu item in ${slot} needs a title or systemImageName and was skipped.`
    )
    return null
  }
  return {
    type: 'action',
    label: props.title ?? props.accessibilityLabel ?? `Toolbar item ${index + 1}`,
    ...(props.description && { description: props.description }),
    ...(headerIcon(props.systemImageName) && { icon: headerIcon(props.systemImageName) }),
    onPress: resolveToolbarHandler(props),
    ...(props.selected ? { state: 'on' as const } : null),
    ...(props.disabled && { disabled: true }),
    ...(props.destructive && { destructive: true }),
  }
}

function menuChildrenToHeaderMenuItems(children: ReactNode, slot: string) {
  const items: NonNullable<
    Extract<NativeStackHeaderItem, { type: 'menu' }>['menu']['items']
  > = []
  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return
    if (isKind(child, 'item')) {
      const action = itemElementToMenuAction(child, index, slot)
      if (action) items.push(action)
    } else if (isKind(child, 'menu')) {
      const submenu = menuElementToHeaderSubmenu(child, index, slot)
      if (submenu) items.push(submenu)
    } else {
      warn(
        `Warning: Unknown child element passed to Stack.Toolbar.Menu: ${childName(child)}`
      )
    }
  })
  return items
}

function menuElementToHeaderSubmenu(
  element: ReactNode,
  index: number,
  slot: string
): Extract<
  Extract<NativeStackHeaderItem, { type: 'menu' }>['menu']['items'][number],
  { type: 'submenu' }
> | null {
  if (!isValidElement(element)) return null
  const props = element.props as StackToolbarMenuProps
  if (props.hidden) return null
  const items = menuChildrenToHeaderMenuItems(props.children, slot)
  if (!items.length) {
    warn(`Warning: Stack.Toolbar submenu "${props.title}" in ${slot} is empty and was skipped.`)
    return null
  }
  return {
    type: 'submenu',
    label: props.title,
    ...(headerIcon(props.systemImageName) && { icon: headerIcon(props.systemImageName) }),
    items,
  }
}

/**
 * Convert one Menu descriptor to a header menu item. Returns null for hidden
 * or empty menus.
 */
export function menuPropsToHeaderMenu(
  element: ReactElement,
  index: number,
  slot: 'leading' | 'trailing'
): NativeStackHeaderItem | null {
  const props = element.props as StackToolbarMenuProps
  if (props.hidden) return null
  const items = menuChildrenToHeaderMenuItems(props.children, slot)
  if (!items.length) {
    warn(`Warning: Stack.Toolbar menu "${props.title}" in ${slot} is empty and was skipped.`)
    return null
  }
  return {
    type: 'menu',
    label: props.label ?? props.title,
    ...(headerIcon(props.systemImageName) && { icon: headerIcon(props.systemImageName) }),
    ...(props.tintColor !== undefined && { tintColor: props.tintColor }),
    ...(props.disabled && { disabled: true }),
    ...(props.sharesBackground !== undefined && {
      sharesBackground: props.sharesBackground,
    }),
    ...(props.hidesSharedBackground !== undefined && {
      hidesSharedBackground: props.hidesSharedBackground,
    }),
    ...(props.identifier
      ? { identifier: props.identifier }
      : { identifier: fallbackIdentifier(slot, index, props.title) }),
    ...(props.accessibilityLabel && { accessibilityLabel: props.accessibilityLabel }),
    ...(props.accessibilityHint && { accessibilityHint: props.accessibilityHint }),
    menu: { title: props.title, items },
  } as NativeStackHeaderItem
}

/**
 * Convert slot children to native header items. Hidden and empty descriptors
 * are omitted because header buttons have no hidden slot.
 */
export function slotChildrenToHeaderItems(
  children: ReactNode,
  slot: 'leading' | 'trailing'
): NativeStackHeaderItem[] {
  const items: NativeStackHeaderItem[] = []
  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return
    if (isKind(child, 'item')) {
      const item = itemPropsToHeaderButton(child.props as StackToolbarItemProps, index, slot)
      if (item) items.push(item)
    } else if (isKind(child, 'menu')) {
      const menu = menuPropsToHeaderMenu(child, index, slot)
      if (menu) items.push(menu)
    } else {
      warn(
        `Warning: Unknown child element passed to Stack.Toolbar slot "${slot}": ${childName(child)}`
      )
    }
  })
  return items
}

export interface BottomToolbarItemData {
  kind: 'item'
  identifier: string
  title?: string
  systemImageName?: string
  tintColor?: ColorValue
  disabled?: boolean
  sharesBackground?: boolean
  hidesSharedBackground?: boolean
  hidden?: boolean
  selected?: boolean
  /** Carried for menu children; maps to the MenuAction destructive flag. */
  destructive?: boolean
  accessibilityLabel?: string
  accessibilityHint?: string
  handler: () => void
}

export interface BottomToolbarMenuData {
  kind: 'menu'
  identifier: string
  title: string
  label?: string
  icon?: string
  tintColor?: ColorValue
  disabled?: boolean
  sharesBackground?: boolean
  hidesSharedBackground?: boolean
  hidden?: boolean
  accessibilityLabel?: string
  accessibilityHint?: string
  children: (BottomToolbarItemData | BottomToolbarMenuData)[]
}

export type BottomToolbarData = BottomToolbarItemData | BottomToolbarMenuData

function bottomItemData(
  props: StackToolbarItemProps,
  index: number,
  path: string
): BottomToolbarItemData {
  return {
    kind: 'item',
    identifier: props.identifier ?? fallbackIdentifier('bottom', index, props.title),
    title: props.title,
    systemImageName: props.systemImageName,
    tintColor: props.tintColor,
    disabled: props.disabled,
    sharesBackground: props.sharesBackground,
    hidesSharedBackground: props.hidesSharedBackground,
    hidden: props.hidden,
    selected: props.selected,
    accessibilityLabel: props.accessibilityLabel,
    accessibilityHint: props.accessibilityHint,
    handler: resolveToolbarHandler(props),
  }
}

function bottomMenuChildData(
  child: ReactNode,
  index: number,
  path: string
): BottomToolbarItemData | BottomToolbarMenuData | null {
  if (!isValidElement(child)) return null
  if (isKind(child, 'menu')) {
    // MenuActionView renders nested MenuAction children as submenus.
    return bottomMenuData(child, index, `${path}-submenu-${index}`)
  }
  if (!isKind(child, 'item')) {
    warn(
      `Warning: Unknown child element passed to Stack.Toolbar.Menu: ${childName(child)}`
    )
    return null
  }
  const props = child.props as StackToolbarItemProps
  return {
    ...bottomItemData(props, index, path),
    // menu actions carry destructive through MenuAction props
    ...(props.destructive ? { destructive: true } : null),
  }
}

function bottomMenuData(
  element: ReactElement,
  index: number,
  path: string
): BottomToolbarMenuData {
  const props = element.props as StackToolbarMenuProps
  const nested: (BottomToolbarItemData | BottomToolbarMenuData)[] = []
  Children.forEach(props.children, (nestedChild, nestedIndex) => {
    const item = bottomMenuChildData(nestedChild, nestedIndex, path)
    if (item) nested.push(item)
  })
  return {
    kind: 'menu',
    identifier: props.identifier ?? fallbackIdentifier('bottom', index, props.title),
    title: props.title,
    label: props.label,
    icon: props.systemImageName,
    tintColor: props.tintColor,
    disabled: props.disabled,
    sharesBackground: props.sharesBackground,
    hidesSharedBackground: props.hidesSharedBackground,
    hidden: props.hidden,
    accessibilityLabel: props.accessibilityLabel,
    accessibilityHint: props.accessibilityHint,
    children: nested,
  }
}

/**
 * Convert bottom slot children to plain toolbar descriptors. Unlike header
 * items, hidden is preserved because ToolbarItem/MenuAction own a hidden slot.
 * Nested menus are preserved as submenu descriptors.
 */
export function slotChildrenToBottomData(children: ReactNode): BottomToolbarData[] {
  const data: BottomToolbarData[] = []
  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return
    if (isKind(child, 'item')) {
      data.push(bottomItemData(child.props as StackToolbarItemProps, index, 'bottom'))
    } else if (isKind(child, 'menu')) {
      data.push(bottomMenuData(child, index, 'bottom'))
    } else {
      warn(
        `Warning: Unknown child element passed to Stack.Toolbar.Bottom: ${childName(child)}`
      )
    }
  })
  return data
}

function findSlot(
  children: ReactNode,
  kinds: StackToolbarKind[]
): ReactElement | undefined {
  let found: ReactElement | undefined
  Children.forEach(children, (child) => {
    if (found || !isValidElement(child)) return
    if (kinds.includes(kindOf(child) as StackToolbarKind)) found = child
  })
  return found
}

/**
 * Map Stack.Toolbar children to native-stack screen options. Leading maps to
 * unstable_headerLeftItems and trailing to unstable_headerRightItems, the
 * genuine iOS header-item path in react-navigation 8 alpha. An explicitly
 * declared slot always wins over incoming options: an empty slot (for
 * example, all items hidden) clears inherited items, while an absent slot
 * preserves them. Bottom has no options equivalent (the toolbar is owned by
 * the screen view controller, so Stack.Toolbar.Bottom must mount in screen
 * content); a bottom slot in layout config warns and is ignored.
 */
export function appendStackToolbarPropsToOptions(
  options: NativeStackNavigationOptions,
  props: StackToolbarProps
): NativeStackNavigationOptions {
  let updated: NativeStackNavigationOptions = { ...options }

  Children.forEach(props.children, (child) => {
    if (!isValidElement(child)) return
    const kind = kindOf(child)
    if (kind !== 'leading' && kind !== 'trailing' && kind !== 'bottom') {
      warn(
        `Warning: Unknown child element passed to Stack.Toolbar: ${childName(child)}`
      )
    }
  })

  const leading = findSlot(props.children, ['leading'])
  if (leading) {
    const items = slotChildrenToHeaderItems(
      (leading.props as StackToolbarSlotProps).children,
      'leading'
    )
    updated = { ...updated, unstable_headerLeftItems: () => items }
  }

  const trailing = findSlot(props.children, ['trailing'])
  if (trailing) {
    const items = slotChildrenToHeaderItems(
      (trailing.props as StackToolbarSlotProps).children,
      'trailing'
    )
    updated = { ...updated, unstable_headerRightItems: () => items }
  }

  if (findSlot(props.children, ['bottom'])) {
    warn(
      'Warning: Stack.Toolbar.Bottom in layout config has no effect. Mount Stack.Toolbar.Bottom in screen content so the toolbar host sits inside the screen view controller.'
    )
  }

  return updated
}

export { isKind as isToolbarKind }
