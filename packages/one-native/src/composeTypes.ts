import type { ColorValue, StyleProp, ViewProps, ViewStyle } from 'react-native'
import type { ReactNode } from 'react'

export type ComposeStyle = Readonly<{
  backgroundColor?: ColorValue
  foregroundColor?: ColorValue
  padding?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number
  width?: number
  height?: number
  fillMaxWidth?: boolean
  fillMaxHeight?: boolean
  cornerRadius?: number
  opacity?: number
  borderColor?: ColorValue
  borderWidth?: number
}>

export type ComposeHorizontalAlignment = 'start' | 'centerHorizontally' | 'end'
export type ComposeVerticalAlignment = 'top' | 'centerVertically' | 'bottom'
export type ComposeContentAlignment =
  | 'topStart'
  | 'topCenter'
  | 'topEnd'
  | 'centerStart'
  | 'center'
  | 'centerEnd'
  | 'bottomStart'
  | 'bottomCenter'
  | 'bottomEnd'
  | 'top'
  | 'bottom'
  | 'start'
  | 'end'

export type ComposeVerticalArrangement =
  | 'top'
  | 'center'
  | 'bottom'
  | 'spaceBetween'
  | 'spaceAround'
  | 'spaceEvenly'
export type ComposeHorizontalArrangement =
  | 'start'
  | 'center'
  | 'end'
  | 'spaceBetween'
  | 'spaceAround'
  | 'spaceEvenly'

export type ComposeTextAlign =
  | 'unspecified'
  | 'left'
  | 'right'
  | 'center'
  | 'justify'
  | 'start'
  | 'end'
export type ComposeFontWeight =
  | 'thin'
  | 'extraLight'
  | 'light'
  | 'normal'
  | 'medium'
  | 'semiBold'
  | 'bold'
  | 'extraBold'
  | 'black'

export interface ComposeNodeProps extends Pick<
  ViewProps,
  'accessibilityLabel' | 'accessibilityRole' | 'accessibilityState' | 'testID'
> {
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  composeStyle?: ComposeStyle
}

export interface ComposeColumnProps extends ComposeNodeProps {
  horizontalAlignment?: ComposeHorizontalAlignment
  verticalArrangement?: ComposeVerticalArrangement
}

export interface ComposeRowProps extends ComposeNodeProps {
  verticalAlignment?: ComposeVerticalAlignment
  horizontalArrangement?: ComposeHorizontalArrangement
}

export interface ComposeBoxProps extends ComposeNodeProps {
  contentAlignment?: ComposeContentAlignment
}

export interface ComposeTextProps extends ComposeNodeProps {
  text: string
  fontSize?: number
  fontWeight?: ComposeFontWeight
  textAlign?: ComposeTextAlign
  maxLines?: number
}

export type ComposeButtonVariant = 'filled' | 'outlined' | 'text'
export type ComposeButtonTone = 'default' | 'danger'

export interface ComposeButtonProps extends ComposeNodeProps {
  label: string
  disabled?: boolean
  variant?: ComposeButtonVariant
  tone?: ComposeButtonTone
  onPress?: () => void
}

export interface ComposeSwitchProps extends ComposeNodeProps {
  isOn: boolean
  disabled?: boolean
  label?: string
  onIsOnChange: (value: boolean) => void
  revision?: number
}
