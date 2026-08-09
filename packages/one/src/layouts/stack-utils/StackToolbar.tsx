'use client'

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { useMemo } from 'react'

import { useIsomorphicLayoutEffect } from '@vxrn/use-isomorphic-layout-effect'
import { NAVIGATOR_CONFIG } from '../../headless/children'
import { useNavigation } from '../../router/useNavigation'
import {
  STACK_TOOLBAR_CHILD,
  getStackToolbarImplementation,
  type StackToolbarImplementation,
} from './StackToolbarImplementation'
import { appendStackToolbarConfig } from './StackToolbar.shared'
import type {
  StackToolbarBadgeProps,
  StackToolbarButtonProps,
  StackToolbarIconProps,
  StackToolbarLabelProps,
  StackToolbarMenuActionProps,
  StackToolbarMenuProps,
  StackToolbarProps,
  StackToolbarSearchBarSlotProps,
  StackToolbarSpacerProps,
  StackToolbarViewProps,
} from './StackToolbar.types'

export function appendStackToolbarPropsToOptions(
  options: NativeStackNavigationOptions,
  props: StackToolbarProps,
  implementation?: StackToolbarImplementation | null
) {
  const optionsWithConfig = appendStackToolbarConfig(options, props)
  return implementation
    ? implementation.appendPropsToOptions(optionsWithConfig, props)
    : optionsWithConfig
}

function StackToolbarComponent(props: StackToolbarProps) {
  const navigation = useNavigation()
  const implementation = getStackToolbarImplementation()
  const options = useMemo(
    () => appendStackToolbarPropsToOptions({}, props, implementation),
    [
      implementation,
      props.placement,
      props.asChild,
      props.children,
      props.disableImePadding,
      props.tintColor,
      props.backgroundColor,
    ]
  )

  useIsomorphicLayoutEffect(() => {
    navigation.setOptions(options)
  }, [navigation, options])

  return implementation?.render(props) ?? null
}

export function StackToolbarButton(_props: StackToolbarButtonProps) {
  return null
}

export function StackToolbarMenu(_props: StackToolbarMenuProps) {
  return null
}

export function StackToolbarMenuAction(_props: StackToolbarMenuActionProps) {
  return null
}

export function StackToolbarSpacer(_props: StackToolbarSpacerProps) {
  return null
}

export function StackToolbarSearchBarSlot(_props: StackToolbarSearchBarSlotProps) {
  return null
}

export function StackToolbarView(_props: StackToolbarViewProps) {
  return null
}

export function StackToolbarLabel(_props: StackToolbarLabelProps) {
  return null
}

export function StackToolbarIcon(_props: StackToolbarIconProps) {
  return null
}

export function StackToolbarBadge(_props: StackToolbarBadgeProps) {
  return null
}

Object.assign(StackToolbarButton, { [STACK_TOOLBAR_CHILD]: 'button' })
Object.assign(StackToolbarMenu, { [STACK_TOOLBAR_CHILD]: 'menu' })
Object.assign(StackToolbarMenuAction, { [STACK_TOOLBAR_CHILD]: 'menuAction' })
Object.assign(StackToolbarSpacer, { [STACK_TOOLBAR_CHILD]: 'spacer' })
Object.assign(StackToolbarSearchBarSlot, { [STACK_TOOLBAR_CHILD]: 'searchBarSlot' })
Object.assign(StackToolbarView, { [STACK_TOOLBAR_CHILD]: 'view' })
Object.assign(StackToolbarLabel, { [STACK_TOOLBAR_CHILD]: 'label' })
Object.assign(StackToolbarIcon, { [STACK_TOOLBAR_CHILD]: 'icon' })
Object.assign(StackToolbarBadge, { [STACK_TOOLBAR_CHILD]: 'badge' })

export const StackToolbar = Object.assign(StackToolbarComponent, {
  [NAVIGATOR_CONFIG]: true,
  Button: StackToolbarButton,
  Menu: StackToolbarMenu,
  MenuAction: StackToolbarMenuAction,
  Spacer: StackToolbarSpacer,
  SearchBarSlot: StackToolbarSearchBarSlot,
  View: StackToolbarView,
  Label: StackToolbarLabel,
  Icon: StackToolbarIcon,
  Badge: StackToolbarBadge,
})

export type {
  StackToolbarBadgeProps,
  StackToolbarButtonProps,
  StackToolbarConfig,
  StackToolbarIconProps,
  StackToolbarLabelProps,
  StackToolbarMenuActionProps,
  StackToolbarMenuProps,
  StackToolbarPlacement,
  StackToolbarProps,
  StackToolbarSearchBarSlotProps,
  StackToolbarSpacerProps,
  StackToolbarViewProps,
} from './StackToolbar.types'
