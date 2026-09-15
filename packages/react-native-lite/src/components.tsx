import React from 'react'

export interface ViewStyle {
  flex?: number
  flexDirection?: 'row' | 'column'
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch'
  padding?: number
  paddingHorizontal?: number
  paddingVertical?: number
  paddingTop?: number
  paddingBottom?: number
  paddingLeft?: number
  paddingRight?: number
  margin?: number
  marginBottom?: number
  marginTop?: number
  marginLeft?: number
  marginRight?: number
  gap?: number
  width?: number | string
  height?: number | string
  backgroundColor?: string
  borderRadius?: number
  borderWidth?: number
  borderColor?: string
  opacity?: number
  overflow?: 'hidden' | 'visible'
}

export interface TextStyle {
  fontSize?: number
  fontWeight?: 'normal' | 'bold' | '500' | '600' | '700' | '800'
  color?: string
  textAlign?: 'left' | 'center' | 'right'
  marginTop?: number
  marginBottom?: number
}

export interface ViewProps {
  style?: ViewStyle
  children?: React.ReactNode
}

export interface TextProps {
  style?: TextStyle
  children?: React.ReactNode
}

export interface ButtonProps {
  title: string
  onPress?: () => void
  style?: ViewStyle
  titleStyle?: TextStyle
  disabled?: boolean
}

export interface TextInputProps {
  value?: string
  defaultValue?: string
  placeholder?: string
  placeholderTextColor?: string
  onChangeText?: (text: string) => void
  filterRegex?: string
  style?: ViewStyle & TextStyle
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'number-pad' | 'email-address'
}

export const View: React.FC<ViewProps> = (props) => {
  return React.createElement('view', props, props.children)
}

export const Text: React.FC<TextProps> = (props) => {
  return React.createElement('text', props, props.children)
}

export const Button: React.FC<ButtonProps> = (props) => {
  return React.createElement('button', props)
}

export const TextInput: React.FC<TextInputProps> = (props) => {
  return React.createElement('textinput', props)
}
