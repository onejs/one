import type { ReactElement } from 'react'
import type { ColorValue } from 'react-native'

export const iconColorRoles = [
  'primary',
  'secondary',
  'tertiary',
  'accent',
  'danger',
] as const

export type IconColorRole = (typeof iconColorRoles)[number]

export type IconElements = Readonly<{
  ios: ReactElement
  android: ReactElement
  web?: ReactElement
}>

type IconColor =
  | { colorRole?: IconColorRole; color?: never }
  | { color?: ColorValue; colorRole?: never }

export type IconProps = IconColor & {
  icons: IconElements
}
