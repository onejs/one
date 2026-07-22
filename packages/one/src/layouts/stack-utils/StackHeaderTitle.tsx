import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import type { StyleProp, TextStyle } from 'react-native'

import { NAVIGATOR_CONFIG } from '../../headless/children'
import { PLATFORM } from '../../utils/platform'
import { convertFontWeightToStringFontWeight, flattenStyle } from '../../utils/style'

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

Object.assign(StackHeaderTitle, { [NAVIGATOR_CONFIG]: true })

export function appendStackHeaderTitlePropsToOptions(
  options: NativeStackNavigationOptions,
  props: StackHeaderTitleProps
): NativeStackNavigationOptions {
  const flattenedStyle = flattenStyle(props.style)
  const flattenedLargeStyle = flattenStyle(props.largeStyle)

  // Build title style only if there are actual style properties
  const titleStyle = flattenedStyle
    ? {
        ...flattenedStyle,
        ...(flattenedStyle?.fontWeight
          ? { fontWeight: convertFontWeightToStringFontWeight(flattenedStyle.fontWeight) }
          : {}),
      }
    : undefined

  // Build large title style only if there are actual style properties
  const largeTitleStyle = flattenedLargeStyle
    ? {
        ...flattenedLargeStyle,
        ...(flattenedLargeStyle?.fontWeight
          ? {
              fontWeight: convertFontWeightToStringFontWeight(
                flattenedLargeStyle.fontWeight
              ),
            }
          : {}),
      }
    : undefined

  return {
    ...options,
    title: props.children,
    headerLargeTitle: props.large,
    // Large titles on iOS require headerTransparent for proper scroll behavior
    // Only set on iOS since headerLargeTitle is iOS-only
    ...(props.large && PLATFORM === 'ios' && { headerTransparent: true }),
    headerTitleAlign: flattenedStyle?.textAlign,
    // Only set styles when explicitly configured to avoid interfering with native defaults
    ...(titleStyle &&
      Object.keys(titleStyle).length > 0 && { headerTitleStyle: titleStyle }),
    ...(largeTitleStyle &&
      Object.keys(largeTitleStyle).length > 0 && {
        headerLargeTitleStyle: largeTitleStyle,
      }),
  }
}
