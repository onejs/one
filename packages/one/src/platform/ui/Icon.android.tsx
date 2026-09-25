import { isValidElement } from 'react'
import { Compose, renderIcon } from '../compose.android'
import type { ComposeIconProps } from '../composeTypes'
import type { IconProps } from './iconTypes'

export function Icon({ icons, colorRole, color }: IconProps) {
  if (
    !isValidElement<ComposeIconProps>(icons.android) ||
    icons.android.type !== Compose.Icon
  )
    throw new Error('One.UI.Icon icons.android must be a One.Android.Icon element')

  const size = icons.android.props.size ?? 24
  return renderIcon(
    {
      ...icons.android.props,
      style: [{ width: size, height: size }, icons.android.props.style],
      composeStyle: {
        ...icons.android.props.composeStyle,
        width: icons.android.props.composeStyle?.width ?? size,
        height: icons.android.props.composeStyle?.height ?? size,
        foregroundColor: color,
      },
    },
    color === undefined ? (colorRole ?? 'primary') : undefined
  )
}

export type { IconColorRole, IconElements, IconProps } from './iconTypes'
