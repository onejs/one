import { useEffect, useMemo } from 'react'
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
  return <StackToolbarHeaderOptions props={props} />
}
mark(StackToolbarComponent, 'toolbar')

function StackToolbarHeaderOptions({ props }: { props: StackToolbarProps }) {
  const navigation = useNavigation()
  const options = useMemo(
    () => appendStackToolbarPropsToOptions({}, props),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.children, props.placement, props.asChild]
  )
  useEffect(() => {
    navigation.setOptions(options as Record<string, unknown>)
  }, [navigation, options])
  return null
}

/**
 * Leaf toolbar button descriptor. Placement comes from the enclosing
 * Stack.Toolbar.
 */
export function StackToolbarButton(_props: StackToolbarButtonProps) {
  return null
}
mark(StackToolbarButton, 'button')

/**
 * Interactive menu descriptor. Children are MenuAction descriptors, nested
 * Menu descriptors become submenus. Label/Icon children configure the bar
 * item; title is the menu title.
 */
export function StackToolbarMenu(_props: StackToolbarMenuProps) {
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
