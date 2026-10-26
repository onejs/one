import { cloneElement, isValidElement } from 'react'
import { PlatformColor, StyleSheet } from 'react-native'
import { Image } from '../generated/Controls.native'
import type { ImageProps } from '../generated/controlTypes'
import { iconColorRoles } from './iconRoles'
import type { IconProps } from './iconTypes'

// the semantic colors SwiftUI's roles name, as platform colors a foreground
// style carries. accent stays dynamic: it rides foregroundColor, which
// resolves the app and ancestor accent instead of freezing a blue.
const roleColors = {
  primary: 'label',
  secondary: 'secondaryLabel',
  tertiary: 'tertiaryLabel',
  accent: undefined,
  danger: 'systemRed',
} as const

export function Icon({ icons, colorRole, color }: IconProps) {
  if (!isValidElement<ImageProps>(icons.ios) || icons.ios.type !== Image)
    throw new Error('One.UI.Icon icons.ios must be a One.iOS.Image element')
  const role = color === undefined ? (colorRole ?? 'primary') : undefined
  if (role && !iconColorRoles.includes(role))
    throw new Error('One.UI.Icon colorRole must be a One.UI icon color role')

  // the icon's sizes also set its React Native frame, which a native state cannot feed.
  const sizes = [icons.ios.props.swiftStyle?.fontSize, icons.ios.props.swiftStyle?.width, icons.ios.props.swiftStyle?.height]
  if (sizes.some((size) => size !== undefined && typeof size !== 'number'))
    throw new Error('One.UI.Icon swiftStyle sizes must be numbers')
  const [fontSize, swiftWidth, swiftHeight] = sizes as (number | undefined)[]
  const fallbackSize = fontSize ?? 24
  const style = [
    {
      width: swiftWidth ?? fallbackSize,
      height: swiftHeight ?? fallbackSize,
    },
    icons.ios.props.style,
  ]
  const { width, height } = StyleSheet.flatten(style)
  const roleColorName = role ? roleColors[role] : undefined
  return cloneElement(icons.ios, {
    style,
    // standalone SwiftUI images report their intrinsic height back to Yoga.
    // give both layouts the same frame so measurement preserves the icon size.
    swiftStyle: {
      ...icons.ios.props.swiftStyle,
      fontSize: fallbackSize,
      width: typeof width === 'number' ? width : swiftWidth,
      height: typeof height === 'number' ? height : swiftHeight,
      foregroundStyle: color ?? (roleColorName ? PlatformColor(roleColorName) : undefined),
      foregroundColor: role === 'accent' ? 'accentColor' : undefined,
    },
  })
}

export type { IconColorRole, IconElements, IconProps } from './iconTypes'
