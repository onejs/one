import { cloneElement, isValidElement } from 'react'
import { PlatformColor, StyleSheet } from 'react-native'
import { Image } from '../generated/Controls.native'
import type { ImageProps } from '../generated/controlTypes'
import { iconColorRoles } from './iconRoles'
import type { IconProps } from './iconTypes'

// the semantic colors SwiftUI's roles name, as platform colors a foreground
// style carries. accent is the default blue; a custom accent above the icon
// will not recolor it.
const roleColors = {
  primary: 'label',
  secondary: 'secondaryLabel',
  tertiary: 'tertiaryLabel',
  accent: 'systemBlue',
  danger: 'systemRed',
} as const

export function Icon({ icons, colorRole, color }: IconProps) {
  if (!isValidElement<ImageProps>(icons.ios) || icons.ios.type !== Image)
    throw new Error('One.UI.Icon icons.ios must be a One.iOS.Image element')
  const role = color === undefined ? (colorRole ?? 'primary') : undefined
  if (role && !iconColorRoles.includes(role))
    throw new Error('One.UI.Icon colorRole must be a One.UI icon color role')

  const fallbackSize = icons.ios.props.swiftStyle?.fontSize ?? 24
  const style = [
    {
      width: icons.ios.props.swiftStyle?.width ?? fallbackSize,
      height: icons.ios.props.swiftStyle?.height ?? fallbackSize,
    },
    icons.ios.props.style,
  ]
  const { width, height } = StyleSheet.flatten(style)
  return cloneElement(icons.ios, {
    style,
    // standalone SwiftUI images report their intrinsic height back to Yoga.
    // give both layouts the same frame so measurement preserves the icon size.
    swiftStyle: {
      ...icons.ios.props.swiftStyle,
      fontSize: fallbackSize,
      width: typeof width === 'number' ? width : icons.ios.props.swiftStyle?.width,
      height: typeof height === 'number' ? height : icons.ios.props.swiftStyle?.height,
      foregroundStyle: color ?? (role ? PlatformColor(roleColors[role]) : undefined),
    },
  })
}

export type { IconColorRole, IconElements, IconProps } from './iconTypes'
