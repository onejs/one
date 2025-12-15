import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native'

import { convertFontWeightToStringFontWeight } from '../../utils/style'

export type StackHeaderTitleProps = {
  children?: string
  style?: StyleProp<{
    fontFamily?: TextStyle['fontFamily']
    fontSize?: TextStyle['fontSize']
    fontWeight?: Exclude<TextStyle['fontWeight'], number>
    color?: string
    textAlign?: 'left' | 'center'
  }>
  largeStyle?: StyleProp<{
    fontFamily?: TextStyle['fontFamily']
    fontSize?: TextStyle['fontSize']
    fontWeight?: Exclude<TextStyle['fontWeight'], number>
    color?: string
  }>
  large?: boolean
}

/**
 * Configuration component for stack header title.
 * This component doesn't render anything - it's used to configure the header.
 */
export function StackHeaderTitle(_props: StackHeaderTitleProps) {
  return null
}

export function appendStackHeaderTitlePropsToOptions(
  options: NativeStackNavigationOptions,
  props: StackHeaderTitleProps
): NativeStackNavigationOptions {
  const flattenedStyle = StyleSheet.flatten(props.style)
  const flattenedLargeStyle = StyleSheet.flatten(props.largeStyle)

  return {
    ...options,
    title: props.children,
    headerLargeTitle: props.large,
    headerTitleAlign: flattenedStyle?.textAlign,
    headerTitleStyle: {
      ...flattenedStyle,
      ...(flattenedStyle?.fontWeight
        ? {
            fontWeight: convertFontWeightToStringFontWeight(flattenedStyle?.fontWeight),
          }
        : {}),
    },
    headerLargeTitleStyle: {
      ...flattenedLargeStyle,
      ...(flattenedLargeStyle?.fontWeight
        ? {
            fontWeight: convertFontWeightToStringFontWeight(flattenedLargeStyle?.fontWeight),
          }
        : {}),
    },
  }
}
