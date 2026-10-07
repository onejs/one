import { cloneElement, isValidElement } from 'react'
import { StyleSheet } from 'react-native'
import { Image } from '../generated/Controls.native'
import type { ImageProps } from '../generated/controlTypes'
import type { IconProps } from './iconTypes'

export function Icon({ icons, colorRole, color }: IconProps) {
  if (!isValidElement<ImageProps>(icons.ios) || icons.ios.type !== Image)
    throw new Error('One.UI.Icon icons.ios must be a One.iOS.Image element')

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
    colorRole: color === undefined ? (colorRole ?? 'primary') : undefined,
    style,
    // standalone SwiftUI images report their intrinsic height back to Yoga.
    // give both layouts the same frame so measurement preserves the icon size.
    swiftStyle: {
      ...icons.ios.props.swiftStyle,
      fontSize: fallbackSize,
      width: typeof width === 'number' ? width : icons.ios.props.swiftStyle?.width,
      height: typeof height === 'number' ? height : icons.ios.props.swiftStyle?.height,
      foregroundStyle: color,
    },
  })
}

export type { IconColorRole, IconElements, IconProps } from './iconTypes'
