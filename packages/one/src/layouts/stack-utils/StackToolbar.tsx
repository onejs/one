import { Children, isValidElement, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigation } from '@react-navigation/native'

import { NAVIGATOR_CONFIG } from '../../headless/children'
import { PLATFORM } from '../../utils/platform'
import {
  TOOLBAR_KIND,
  appendStackToolbarPropsToOptions,
  isToolbarKind,
  type StackToolbarBadgeProps,
  type StackToolbarButtonProps,
  type StackToolbarIconProps,
  type StackToolbarLabelProps,
  type StackToolbarMenuActionProps,
  type StackToolbarMenuProps,
  type StackToolbarProps,
  type StackToolbarSearchBarSlotProps,
  type StackToolbarSpacerProps,
} from './stackToolbarDescriptors'
import { BottomToolbarHost } from './StackToolbarBottomHost'

export type {
  BottomToolbarButtonData,
  BottomToolbarData,
  BottomToolbarMenuActionData,
  BottomToolbarMenuData,
  BottomToolbarSearchBarSlotData,
  BottomToolbarSpacerData,
  BottomToolbarSubmenuData,
  StackToolbarBadgeProps,
  StackToolbarButtonProps,
  StackToolbarIconProps,
  StackToolbarLabelProps,
  StackToolbarMenuActionProps,
  StackToolbarMenuProps,
  StackToolbarPlacement,
  StackToolbarProps,
  StackToolbarSearchBarSlotProps,
  StackToolbarSpacerProps,
  StackToolbarVariant,
} from './stackToolbarDescriptors'
export { appendStackToolbarPropsToOptions } from './stackToolbarDescriptors'

function mark<ComponentT extends (...args: never[]) => unknown>(
  component: ComponentT,
  kind: string
) {
  return Object.assign(component, { [NAVIGATOR_CONFIG]: true, [TOOLBAR_KIND]: kind })
}

function checkInvalidChildren(component: 'Button' | 'Menu', children: ReactNode) {
  if (process.env.NODE_ENV === 'production') return
  const allowed =
    component === 'Button'
      ? 'a single string or Stack.Toolbar.Label, Stack.Toolbar.Icon, and Stack.Toolbar.Badge'
      : 'Stack.Toolbar.Menu, Stack.Toolbar.MenuAction, Stack.Toolbar.Label, Stack.Toolbar.Icon, and Stack.Toolbar.Badge'
  const kinds =
    component === 'Button'
      ? ['label', 'icon', 'badge']
      : ['menu', 'menuAction', 'label', 'icon', 'badge']
  if (typeof children === 'string') return
  const all = Children.toArray(children)
  const valid = all.filter(
    (child) =>
      typeof child === 'string' ||
      typeof child === 'number' ||
      (isValidElement(child) &&
        kinds.includes(
          (child.type as { [TOOLBAR_KIND]?: string })?.[TOOLBAR_KIND] as string
        ))
  )
  if (all.length !== valid.length) {
    throw new Error(`Stack.Toolbar.${component} only accepts ${allowed} as its children.`)
  }
}

/**
 * Declarative toolbar. Bottom (the default) renders the navigation-controller
 * toolbar in place and must mount in screen content; left/right set header
 * items, from layout config or, when rendered in a page, through the
 * screen's navigation options, as in Expo.
 */
export function StackToolbarComponent(props: StackToolbarProps) {
  const placement = props.placement ?? 'bottom'
  if (placement === 'bottom') {
    // iOS only: there is no Android toolbar host, so this renders null elsewhere.
    if (PLATFORM !== 'ios') return null
    return <BottomToolbarHost>{props.children}</BottomToolbarHost>
  }
  return <StackToolbarHeaderOptions placement={placement} props={props} />
}
mark(StackToolbarComponent, 'toolbar')

function StackToolbarHeaderOptions({
  placement,
  props,
}: {
  placement: 'left' | 'right'
  props: StackToolbarProps
}) {
  const navigation = useNavigation()
  const options = useMemo(
    () => appendStackToolbarPropsToOptions({}, props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.children, props.placement, props.asChild]
  )
  useEffect(() => {
    navigation.setOptions(options as Record<string, unknown>)
  }, [navigation, options])
  void placement
  return null
}

/**
 * Leaf toolbar button descriptor. Placement comes from the enclosing
 * Stack.Toolbar.
 */
export function StackToolbarButton(props: StackToolbarButtonProps) {
  checkInvalidChildren('Button', props.children)
  return null
}
mark(StackToolbarButton, 'button')

/**
 * Interactive menu descriptor. Children are MenuAction descriptors, nested
 * Menu descriptors become submenus. Label/Icon children configure the bar
 * item; title is the menu title.
 */
export function StackToolbarMenu(props: StackToolbarMenuProps) {
  checkInvalidChildren('Menu', props.children)
  return null
}
mark(StackToolbarMenu, 'menu')

/** Leaf menu action descriptor. */
export function StackToolbarMenuAction(_props: StackToolbarMenuActionProps) {
  return null
}
mark(StackToolbarMenuAction, 'menuAction')

/** Flexible spacer, or fixed when width is set. */
export function StackToolbarSpacer(_props: StackToolbarSpacerProps) {
  return null
}
mark(StackToolbarSpacer, 'spacer')

/** Bottom-only slot for the screen's search bar. */
export function StackToolbarSearchBarSlot(_props: StackToolbarSearchBarSlotProps) {
  return null
}
mark(StackToolbarSearchBarSlot, 'searchBarSlot')

/** Text label primitive for Button and Menu children. */
export function StackToolbarLabel(_props: StackToolbarLabelProps) {
  return null
}
mark(StackToolbarLabel, 'label')

/** Icon primitive for Button, Menu, and MenuAction children. */
export function StackToolbarIcon(_props: StackToolbarIconProps) {
  return null
}
mark(StackToolbarIcon, 'icon')

/** Badge primitive. Left/right only; bottom throws in dev. */
export function StackToolbarBadge(_props: StackToolbarBadgeProps) {
  return null
}
mark(StackToolbarBadge, 'badge')

export { isToolbarKind }
