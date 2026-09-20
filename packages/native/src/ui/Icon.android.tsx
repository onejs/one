import { cloneElement, isValidElement } from 'react'
import type { ColorValue } from 'react-native'
import type { IconProps } from './iconTypes'

type ResponsiveIconProps = {
  colorRole?: string
  composeStyle?: Readonly<Record<string, unknown>> & {
    foregroundColor?: ColorValue
  }
}

export function Icon({ icons, colorRole, color }: IconProps) {
  if (!isValidElement<ResponsiveIconProps>(icons.android))
    throw new Error('One.UI.Icon icons.android must be a React element')

  return cloneElement(icons.android, {
    colorRole: color === undefined ? (colorRole ?? 'primary') : undefined,
    composeStyle:
      color === undefined
        ? icons.android.props.composeStyle
        : { ...icons.android.props.composeStyle, foregroundColor: color },
  })
}

export type { IconColorRole, IconElements, IconProps } from './iconTypes'
