import { cloneElement, isValidElement } from 'react'
import { Image } from '../generated/Controls.native'
import type { ImageProps } from '../generated/controlTypes'
import type { IconProps } from './iconTypes'

export function Icon({ icons, colorRole, color }: IconProps) {
  if (!isValidElement<ImageProps>(icons.ios) || icons.ios.type !== Image)
    throw new Error('One.UI.Icon icons.ios must be a One.iOS.Image element')

  const fallbackSize = icons.ios.props.swiftStyle?.fontSize ?? 24
  return cloneElement(icons.ios, {
    colorRole: color === undefined ? (colorRole ?? 'primary') : undefined,
    style: [
      {
        width: icons.ios.props.swiftStyle?.width ?? fallbackSize,
        height: icons.ios.props.swiftStyle?.height ?? fallbackSize,
      },
      icons.ios.props.style,
    ],
    swiftStyle: { ...icons.ios.props.swiftStyle, foregroundStyle: color },
  })
}

export type { IconColorRole, IconElements, IconProps } from './iconTypes'
