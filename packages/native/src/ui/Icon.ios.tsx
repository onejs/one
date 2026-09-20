import { cloneElement, isValidElement } from 'react'
import type { ColorValue } from 'react-native'
import type { IconProps } from './iconTypes'

type ResponsiveIconProps = {
  colorRole?: string
  swiftStyle?: Readonly<Record<string, unknown>> & {
    foregroundStyle?: ColorValue
  }
}

export function Icon({ icons, colorRole, color }: IconProps) {
  if (!isValidElement<ResponsiveIconProps>(icons.ios))
    throw new Error('One.UI.Icon icons.ios must be a React element')

  return cloneElement(icons.ios, {
    colorRole: color === undefined ? (colorRole ?? 'primary') : undefined,
    swiftStyle: { ...icons.ios.props.swiftStyle, foregroundStyle: color },
  })
}

export type { IconColorRole, IconElements, IconProps } from './iconTypes'
