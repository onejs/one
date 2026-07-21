'use client'

import type {
  NativeStackHeaderItem,
  NativeStackHeaderItemButton,
  NativeStackHeaderItemMenu,
  NativeStackHeaderItemMenuAction,
  NativeStackHeaderItemMenuSubmenu,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack'
import { MenuAction, ToolbarHost, ToolbarItem } from '@vxrn/native'
import {
  Children,
  createContext,
  Fragment,
  useContext,
  useId,
  useMemo,
  type ReactNode,
} from 'react'
import { Platform, StyleSheet, type ImageSourcePropType } from 'react-native'

import { NAVIGATOR_CONFIG } from '../../headless/children'
import type {
  StackToolbarBadgeProps,
  StackToolbarButtonProps,
  StackToolbarIconProps,
  StackToolbarItemProps,
  StackToolbarLabelProps,
  StackToolbarMenuActionProps,
  StackToolbarMenuProps,
  StackToolbarPlacement,
  StackToolbarProps,
  StackToolbarSearchBarSlotProps,
  StackToolbarSpacerProps,
  StackToolbarViewProps,
} from './StackToolbar.types'
import { useIsomorphicLayoutEffect } from '@vxrn/use-isomorphic-layout-effect'
import { useNavigation } from '../../router/useNavigation'
import { isChildOfType } from '../../utils/children'

const StackToolbarPlacementContext = createContext<StackToolbarPlacement | null>(null)

export function StackToolbarLabel(_props: StackToolbarLabelProps) {
  return null
}

export function StackToolbarIcon(_props: StackToolbarIconProps) {
  return null
}

export function StackToolbarBadge(_props: StackToolbarBadgeProps) {
  return null
}

type ToolbarContent = {
  label: string
  icon?: StackToolbarIconProps
  badge?: StackToolbarBadgeProps
}

function getToolbarContent(
  children: ReactNode,
  icon?: string | ImageSourcePropType,
  iconRenderingMode?: 'template' | 'original'
): ToolbarContent {
  let label = ''
  let iconProps: StackToolbarIconProps | undefined =
    typeof icon === 'string'
      ? { sf: icon }
      : icon
        ? { src: icon, renderingMode: iconRenderingMode }
        : undefined
  let badge: StackToolbarBadgeProps | undefined

  Children.forEach(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      label += String(child)
    } else if (isChildOfType(child, StackToolbarLabel)) {
      label = child.props.children ?? ''
    } else if (isChildOfType(child, StackToolbarIcon)) {
      iconProps = child.props
    } else if (isChildOfType(child, StackToolbarBadge)) {
      badge = child.props
    }
  })

  return { label, icon: iconProps, badge }
}

function getHeaderIcon(
  content: ToolbarContent,
  tintColor?: StackToolbarItemProps['tintColor']
) {
  if (content.icon?.sf) {
    return { type: 'sfSymbol' as const, name: content.icon.sf }
  }
  if (content.icon?.src) {
    return {
      type: 'image' as const,
      source: content.icon.src,
      tinted:
        (content.icon.renderingMode ?? (tintColor ? 'template' : 'original')) ===
        'template',
    }
  }
  if (content.icon?.xcasset) {
    return {
      type: 'image' as const,
      source: { uri: content.icon.xcasset },
      tinted:
        (content.icon.renderingMode ?? (tintColor ? 'template' : 'original')) ===
        'template',
    }
  }
  return undefined
}

function getHeaderItemSharedProps(
  props: StackToolbarButtonProps | StackToolbarMenuProps,
  content: ToolbarContent
) {
  const labelStyle = StyleSheet.flatten(props.style)
  const badgeStyle = StyleSheet.flatten(content.badge?.style)

  return {
    label: content.label,
    labelStyle,
    icon: getHeaderIcon(content, props.tintColor),
    variant: props.variant,
    tintColor: props.tintColor,
    disabled: props.disabled,
    hidesSharedBackground: props.hidesSharedBackground,
    sharesBackground: !props.separateBackground,
    accessibilityLabel: props.accessibilityLabel ?? content.label,
    accessibilityHint: props.accessibilityHint,
    badge: content.badge
      ? {
          value: content.badge.children ?? '',
          style: badgeStyle,
        }
      : undefined,
  }
}

function getMenuItems(children: ReactNode): NativeStackHeaderItemMenu['menu']['items'] {
  return Children.toArray(children)
    .map(
      (
        child
      ): NativeStackHeaderItemMenuAction | NativeStackHeaderItemMenuSubmenu | null => {
        if (isChildOfType(child, StackToolbarMenuAction)) {
          const content = getToolbarContent(
            child.props.children,
            child.props.icon,
            child.props.iconRenderingMode
          )
          return {
            type: 'action',
            label: content.label,
            description: child.props.subtitle,
            icon: getHeaderIcon(content, child.props.tintColor),
            onPress: child.props.onPress ?? (() => {}),
            state: child.props.isOn ? 'on' : 'off',
            disabled: child.props.disabled,
            destructive: child.props.destructive,
            hidden: child.props.hidden,
            keepsMenuPresented: child.props.unstable_keepPresented,
            discoverabilityLabel: child.props.discoverabilityLabel,
          } as NativeStackHeaderItemMenuAction
        }

        if (isChildOfType(child, StackToolbarMenu)) {
          const content = getToolbarContent(
            child.props.children,
            child.props.icon,
            child.props.iconRenderingMode
          )
          return {
            type: 'submenu',
            label: content.label || child.props.title || '',
            icon: getHeaderIcon(content, child.props.tintColor),
            inline: child.props.inline,
            layout: child.props.palette ? 'palette' : 'default',
            destructive: child.props.destructive,
            multiselectable: child.props.singleSelection === false,
            items: getMenuItems(child.props.children),
          } as NativeStackHeaderItemMenuSubmenu
        }

        return null
      }
    )
    .filter(
      (
        item
      ): item is NativeStackHeaderItemMenuAction | NativeStackHeaderItemMenuSubmenu =>
        Boolean(item)
    )
}

function convertToolbarChildToHeaderItem(child: ReactNode): NativeStackHeaderItem | null {
  if (isChildOfType(child, StackToolbarButton)) {
    if (child.props.hidden) return null
    const content = getToolbarContent(
      child.props.children,
      child.props.icon,
      child.props.iconRenderingMode
    )
    return {
      ...getHeaderItemSharedProps(child.props, content),
      type: 'button',
      onPress: child.props.onPress ?? (() => {}),
      selected: child.props.selected,
    } as NativeStackHeaderItemButton
  }

  if (isChildOfType(child, StackToolbarMenu)) {
    if (child.props.hidden) return null
    const content = getToolbarContent(
      child.props.children,
      child.props.icon,
      child.props.iconRenderingMode
    )
    const contentWithTitle = {
      ...content,
      label: content.label || child.props.title || '',
    }
    return {
      ...getHeaderItemSharedProps(child.props, contentWithTitle),
      type: 'menu',
      menu: {
        title: child.props.title,
        multiselectable: child.props.singleSelection === false,
        layout: child.props.palette ? 'palette' : 'default',
        items: getMenuItems(child.props.children),
      },
    } as NativeStackHeaderItemMenu
  }

  if (isChildOfType(child, StackToolbarSpacer)) {
    if (child.props.hidden) return null
    if (child.props.width === undefined) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Stack.Toolbar.Spacer requires a width in header placements.')
      }
      return null
    }
    return { type: 'spacing', spacing: child.props.width }
  }

  if (isChildOfType(child, StackToolbarView)) {
    if (child.props.hidden) return null
    return {
      type: 'custom',
      element: <Fragment>{child.props.children}</Fragment>,
      hidesSharedBackground: child.props.hidesSharedBackground,
    }
  }

  return null
}

export function appendStackToolbarPropsToOptions(
  options: NativeStackNavigationOptions,
  props: StackToolbarProps
): NativeStackNavigationOptions {
  if (Platform.OS !== 'ios') return options

  const placement = props.placement ?? 'bottom'
  if (placement === 'bottom') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'Stack.Toolbar with bottom placement must be rendered in a page component, not inside Stack.Screen.'
      )
    }
    return options
  }

  if (placement !== 'left' && placement !== 'right') {
    throw new Error(
      `Invalid placement "${placement}" for Stack.Toolbar. Expected "left", "right", or "bottom".`
    )
  }

  if (props.asChild) {
    return placement === 'left'
      ? { ...options, headerShown: true, headerLeft: () => props.children }
      : { ...options, headerShown: true, headerRight: () => props.children }
  }

  const allChildren = Children.toArray(props.children)
  const items = allChildren
    .map(convertToolbarChildToHeaderItem)
    .filter((item): item is NativeStackHeaderItem => Boolean(item))

  if (process.env.NODE_ENV !== 'production' && items.length !== allChildren.length) {
    const invalidChildren = allChildren.filter(
      (child) =>
        !isChildOfType(child, StackToolbarButton) &&
        !isChildOfType(child, StackToolbarMenu) &&
        !isChildOfType(child, StackToolbarSpacer) &&
        !isChildOfType(child, StackToolbarView)
    )
    if (invalidChildren.length) {
      console.warn(
        `Stack.Toolbar with placement="${placement}" only accepts Stack.Toolbar.Button, Menu, Spacer, and View children.`
      )
    }
  }

  const getItems = () => items
  return placement === 'left'
    ? { ...options, headerShown: true, unstable_headerLeftItems: getItems }
    : { ...options, headerShown: true, unstable_headerRightItems: getItems }
}

function StackToolbarComponent(props: StackToolbarProps) {
  const parentPlacement = useContext(StackToolbarPlacementContext)
  const navigation = useNavigation()
  const placement = props.placement ?? 'bottom'
  const options = useMemo(
    () => (placement === 'bottom' ? {} : appendStackToolbarPropsToOptions({}, props)),
    [placement, props.asChild, props.children]
  )

  if (parentPlacement) {
    throw new Error('Stack.Toolbar cannot be nested inside another Stack.Toolbar.')
  }

  useIsomorphicLayoutEffect(() => {
    if (Platform.OS !== 'ios' || placement === 'bottom') return

    navigation.setOptions(options)
  }, [navigation, options, placement])

  if (Platform.OS !== 'ios' || placement !== 'bottom') return null

  return (
    <StackToolbarPlacementContext.Provider value="bottom">
      <ToolbarHost>{props.children}</ToolbarHost>
    </StackToolbarPlacementContext.Provider>
  )
}

export function StackToolbarButton(props: StackToolbarButtonProps) {
  const placement = useContext(StackToolbarPlacementContext)
  const identifier = useId()
  if (Platform.OS !== 'ios') return null
  if (!placement)
    throw new Error('Stack.Toolbar.Button must be used inside Stack.Toolbar.')

  const content = getToolbarContent(props.children, props.icon, props.iconRenderingMode)
  const badgeStyle = StyleSheet.flatten(content.badge?.style)
  return (
    <ToolbarItem
      identifier={identifier}
      title={content.label}
      systemImageName={content.icon?.sf}
      xcassetName={content.icon?.xcasset}
      image={props.image ?? content.icon?.src}
      imageRenderingMode={
        content.icon?.renderingMode ??
        props.iconRenderingMode ??
        (props.tintColor ? 'template' : 'original')
      }
      tintColor={props.tintColor}
      hidesSharedBackground={props.hidesSharedBackground}
      sharesBackground={!props.separateBackground}
      barButtonItemStyle={props.variant === 'done' ? 'prominent' : props.variant}
      hidden={props.hidden}
      selected={props.selected}
      badgeConfiguration={
        content.badge
          ? {
              value: content.badge.children,
              backgroundColor: badgeStyle?.backgroundColor,
              color: badgeStyle?.color,
              fontFamily: badgeStyle?.fontFamily,
              fontSize: badgeStyle?.fontSize,
              fontWeight: badgeStyle?.fontWeight,
            }
          : undefined
      }
      titleStyle={StyleSheet.flatten(props.style)}
      accessibilityLabel={props.accessibilityLabel ?? content.label}
      accessibilityHint={props.accessibilityHint}
      disabled={props.disabled}
      onSelected={props.onPress}
    />
  )
}

export function StackToolbarMenu(props: StackToolbarMenuProps) {
  const placement = useContext(StackToolbarPlacementContext)
  const identifier = useId()
  if (Platform.OS !== 'ios') return null
  if (!placement) throw new Error('Stack.Toolbar.Menu must be used inside Stack.Toolbar.')

  const content = getToolbarContent(props.children, props.icon, props.iconRenderingMode)
  const actions = Children.toArray(props.children).filter(
    (child) =>
      isChildOfType(child, StackToolbarMenu) ||
      isChildOfType(child, StackToolbarMenuAction)
  )
  return (
    <MenuAction
      identifier={identifier}
      title={props.title ?? ''}
      label={content.label || props.title}
      icon={content.icon?.sf}
      xcassetName={content.icon?.xcasset}
      image={props.image ?? content.icon?.src}
      imageRenderingMode={
        content.icon?.renderingMode ??
        props.iconRenderingMode ??
        (props.tintColor ? 'template' : 'original')
      }
      disabled={props.disabled}
      destructive={props.destructive}
      hidden={props.hidden}
      accessibilityLabel={props.accessibilityLabel ?? (content.label || props.title)}
      accessibilityHint={props.accessibilityHint}
      displayInline={props.inline}
      displayAsPalette={props.palette}
      singleSelection={props.singleSelection}
      preferredElementSize={props.elementSize}
      tintColor={props.tintColor}
      barButtonItemStyle={props.variant === 'done' ? 'prominent' : props.variant}
      sharesBackground={!props.separateBackground}
      hidesSharedBackground={props.hidesSharedBackground}
      titleStyle={StyleSheet.flatten(props.style)}
    >
      {actions}
    </MenuAction>
  )
}

export function StackToolbarMenuAction(props: StackToolbarMenuActionProps) {
  const placement = useContext(StackToolbarPlacementContext)
  const identifier = useId()
  if (Platform.OS !== 'ios') return null
  if (!placement)
    throw new Error('Stack.Toolbar.MenuAction must be used inside Stack.Toolbar.Menu.')

  const content = getToolbarContent(props.children, props.icon, props.iconRenderingMode)
  return (
    <MenuAction
      identifier={identifier}
      title={content.label}
      icon={content.icon?.sf}
      xcassetName={content.icon?.xcasset}
      image={props.image ?? content.icon?.src}
      imageRenderingMode={
        content.icon?.renderingMode ??
        props.iconRenderingMode ??
        (props.tintColor ? 'template' : 'original')
      }
      disabled={props.disabled}
      destructive={props.destructive}
      discoverabilityLabel={props.discoverabilityLabel}
      subtitle={props.subtitle}
      accessibilityLabel={props.accessibilityLabel ?? content.label}
      accessibilityHint={props.accessibilityHint}
      isOn={props.isOn}
      keepPresented={props.unstable_keepPresented}
      hidden={props.hidden}
      onSelected={props.onPress}
    />
  )
}

export function StackToolbarSpacer(props: StackToolbarSpacerProps) {
  const placement = useContext(StackToolbarPlacementContext)
  const identifier = useId()
  if (Platform.OS !== 'ios') return null
  if (!placement)
    throw new Error('Stack.Toolbar.Spacer must be used inside Stack.Toolbar.')

  return (
    <ToolbarItem
      identifier={identifier}
      type={props.width === undefined ? 'fluidSpacer' : 'fixedSpacer'}
      width={props.width}
      hidden={props.hidden}
      sharesBackground={props.sharesBackground}
    />
  )
}

export function StackToolbarSearchBarSlot(props: StackToolbarSearchBarSlotProps) {
  const placement = useContext(StackToolbarPlacementContext)
  const identifier = useId()
  if (Platform.OS !== 'ios') return null
  if (!placement)
    throw new Error('Stack.Toolbar.SearchBarSlot must be used inside Stack.Toolbar.')

  return (
    <ToolbarItem
      identifier={identifier}
      type="searchBar"
      hidden={props.hidden}
      hidesSharedBackground={props.hidesSharedBackground}
      sharesBackground={!props.separateBackground}
    />
  )
}

export function StackToolbarView(props: StackToolbarViewProps) {
  const placement = useContext(StackToolbarPlacementContext)
  const identifier = useId()
  if (Platform.OS !== 'ios') return null
  if (!placement) throw new Error('Stack.Toolbar.View must be used inside Stack.Toolbar.')
  if (props.hidden) return null

  return (
    <ToolbarItem
      identifier={identifier}
      hidesSharedBackground={props.hidesSharedBackground}
      sharesBackground={!props.separateBackground}
    >
      {props.children}
    </ToolbarItem>
  )
}

Object.assign(StackToolbarComponent, { [NAVIGATOR_CONFIG]: true })
Object.assign(StackToolbarButton, { [NAVIGATOR_CONFIG]: true })
Object.assign(StackToolbarMenu, { [NAVIGATOR_CONFIG]: true })
Object.assign(StackToolbarMenuAction, { [NAVIGATOR_CONFIG]: true })
Object.assign(StackToolbarSpacer, { [NAVIGATOR_CONFIG]: true })
Object.assign(StackToolbarSearchBarSlot, { [NAVIGATOR_CONFIG]: true })
Object.assign(StackToolbarView, { [NAVIGATOR_CONFIG]: true })
Object.assign(StackToolbarLabel, { [NAVIGATOR_CONFIG]: true })
Object.assign(StackToolbarIcon, { [NAVIGATOR_CONFIG]: true })
Object.assign(StackToolbarBadge, { [NAVIGATOR_CONFIG]: true })

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
