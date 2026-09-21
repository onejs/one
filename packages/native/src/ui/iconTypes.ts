import type { ReactElement } from 'react'
import type { ColorValue } from 'react-native'
import type { ComposeIconProps } from '../composeTypes'
import type { ImageProps } from '../generated/controlTypes'
import type { IconColorRole } from './iconRoles'

export { iconColorRoles, type IconColorRole } from './iconRoles'

export type IconElements = Readonly<{
  ios: ReactElement<ImageProps>
  android: ReactElement<ComposeIconProps>
  web?: ReactElement
}>

type IconColor =
  | { colorRole?: IconColorRole; color?: never }
  | { color?: ColorValue; colorRole?: never }

export type IconProps = IconColor & {
  icons: IconElements
}
