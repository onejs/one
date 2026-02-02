'use client'

import React, { isValidElement, use, useId, type PropsWithChildren, type ReactNode } from 'react'
import type { ViewStyle } from 'react-native'
import { Slot } from '@radix-ui/react-slot'

import { InternalLinkPreviewContext } from './preview/InternalLinkPreviewContext'
import { useIsPreview } from './preview/PreviewRouteContext'
import { NativeLinkPreviewAction, NativeLinkPreviewContent } from './preview/nativeLinkPreview'

export interface LinkMenuActionProps {
  /**
   * The title of the menu item.
   */
  children?: ReactNode
  /**
   * If `true`, the menu item will be displayed as destructive.
   */
  destructive?: boolean
  /**
   * If `true`, the menu item will be disabled and not selectable.
   */
  disabled?: boolean
  /**
   * An elaborated title that explains the purpose of the action.
   */
  discoverabilityLabel?: string
  /**
   * Whether the menu element should be hidden.
   * @default false
   */
  hidden?: boolean
  /**
   * SF Symbol displayed alongside the menu item.
   */
  icon?: string
  /**
   * If `true`, the menu item will be displayed as selected.
   */
  isOn?: boolean
  onPress?: () => void
  /**
   * An optional subtitle for the menu item.
   */
  subtitle?: string
  /**
   * The title of the menu item.
   * @deprecated Use `children` prop instead.
   */
  title?: string
  /**
   * If `true`, the menu will be kept presented after the action is selected.
   */
  unstable_keepPresented?: boolean
}

/**
 * This component renders a context menu action for a link.
 * It should only be used as a child of `Link.Menu` or `LinkMenu`.
 *
 * @platform ios
 */
export function LinkMenuAction(props: LinkMenuActionProps) {
  const identifier = useId()
  const internalContext = use(InternalLinkPreviewContext)

  if (useIsPreview() || process.env.EXPO_OS !== 'ios' || !internalContext) {
    return null
  }

  const { unstable_keepPresented, onPress, children, title, ...rest } = props
  const label = typeof children === 'string' ? children : title

  return (
    <NativeLinkPreviewAction
      {...rest}
      identifier={identifier}
      icon={props.icon}
      title={label ?? ''}
      keepPresented={unstable_keepPresented}
      onSelected={() => onPress?.()}
    />
  )
}

export interface LinkMenuProps {
  /**
   * The title of the menu item
   */
  title?: string
  /**
   * An optional subtitle for the submenu. Does not appear on `inline` menus.
   */
  subtitle?: string
  /**
   * Optional SF Symbol displayed alongside the menu item.
   */
  icon?: string
  /**
   * If `true`, the menu will be displayed as a palette.
   * This means that the menu will be displayed as one row.
   *
   * > **Note**: Palette menus are only supported in submenus.
   */
  palette?: boolean
  /**
   * @deprecated Use `palette` prop instead.
   */
  displayAsPalette?: boolean
  /**
   * If `true`, the menu will be displayed inline.
   * This means that the menu will not be collapsed
   */
  inline?: boolean
  /**
   * @deprecated Use `inline` prop instead.
   */
  displayInline?: boolean
  /**
   * If `true`, the menu item will be displayed as destructive.
   */
  destructive?: boolean
  /**
   * The preferred size of the menu elements.
   * `elementSize` property is ignored when `palette` is used.
   *
   * @platform iOS 16.0+
   */
  elementSize?: 'small' | 'medium' | 'large' | 'auto'
  children?: React.ReactNode
}

/**
 * Groups context menu actions for a link.
 *
 * If multiple `Link.Menu` components are used within a single `Link`, only the first will be rendered.
 * Only `Link.MenuAction` and `LinkMenuAction` components are allowed as children.
 *
 * @platform ios
 */
export const LinkMenu: React.FC<LinkMenuProps> = (props) => {
  const identifier = useId()
  const internalContext = use(InternalLinkPreviewContext)

  if (useIsPreview() || process.env.EXPO_OS !== 'ios' || !internalContext) {
    return null
  }

  const children = React.Children.toArray(props.children).filter(
    (child) => isValidElement(child) && (child.type === LinkMenuAction || child.type === LinkMenu)
  )
  const displayAsPalette = props.palette ?? props.displayAsPalette
  const displayInline = props.inline ?? props.displayInline

  return (
    <NativeLinkPreviewAction
      {...props}
      displayAsPalette={displayAsPalette}
      displayInline={displayInline}
      preferredElementSize={props.elementSize}
      title={props.title ?? ''}
      onSelected={() => {}}
      children={children}
      identifier={identifier}
    />
  )
}

export type LinkPreviewStyle = Omit<ViewStyle, 'position' | 'width' | 'height'> & {
  /**
   * Sets the preferred width of the preview.
   * If not set, full width of the screen will be used.
   *
   * This is only **preferred** width, the actual width may be different
   */
  width?: number

  /**
   * Sets the preferred height of the preview.
   * If not set, full height of the screen will be used.
   *
   * This is only **preferred** height, the actual height may be different
   */
  height?: number
}

export interface LinkPreviewProps {
  children?: React.ReactNode
  /**
   * Custom styles for the preview container.
   *
   * Note that some styles may not work, as they are limited or reset by the native view
   */
  style?: LinkPreviewStyle
}

/**
 * A component used to render and customize the link preview.
 *
 * If `Link.Preview` is used without any props, it will render a preview of the `href` passed to the `Link`.
 *
 * If multiple `Link.Preview` components are used within a single `Link`, only the first one will be rendered.
 *
 * To customize the preview, you can pass custom content as children.
 *
 * @platform ios
 */
export function LinkPreview(props: LinkPreviewProps) {
  const { children, style } = props
  const internalPreviewContext = use(InternalLinkPreviewContext)

  if (useIsPreview() || process.env.EXPO_OS !== 'ios' || !internalPreviewContext) {
    return null
  }

  const { isVisible } = internalPreviewContext
  const { width, height, ...restOfStyle } = style ?? {}
  const contentSize = {
    width: width ?? 0,
    height: height ?? 0,
  }

  const content = isVisible ? children : null

  return (
    <NativeLinkPreviewContent style={restOfStyle} preferredContentSize={contentSize}>
      {content}
    </NativeLinkPreviewContent>
  )
}

export interface LinkTriggerProps extends PropsWithChildren {
  /**
   * A shorthand for enabling the Apple Zoom Transition on this link trigger.
   *
   * When set to `true`, the trigger will be wrapped with `Link.AppleZoom`.
   * If another `Link.AppleZoom` is already used inside `Link.Trigger`, an error
   * will be thrown.
   *
   * @platform ios 18+
   */
  withAppleZoom?: boolean
}

/**
 * Serves as the trigger for a link.
 * The content inside this component will be rendered as part of the base link.
 *
 * If multiple `Link.Trigger` components are used within a single `Link`, only the first will be rendered.
 *
 * @platform ios
 */
export function LinkTrigger({ withAppleZoom: _withAppleZoom, ...props }: LinkTriggerProps) {
  if (React.Children.count(props.children) > 1 || !isValidElement(props.children)) {
    // If onPress is passed, this means that Link passed props to this component.
    // We can assume that asChild is used, so we throw an error, because link will not work in this case.
    if (props && typeof props === 'object' && 'onPress' in props) {
      throw new Error(
        'When using Link.Trigger in an asChild Link, you must pass a single child element that will emit onPress event.'
      )
    }
    return props.children
  }

  return <Slot {...props} />
}
