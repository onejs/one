import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { Children, isValidElement, type ReactNode } from 'react'
import { StyleSheet, type ColorValue, type StyleProp } from 'react-native'
import type { ScreenStackHeaderConfigProps } from 'react-native-screens'

import {
  appendStackHeaderBackButtonPropsToOptions,
  StackHeaderBackButton,
} from './StackHeaderBackButton'
import { StackHeaderLeft, appendStackHeaderLeftPropsToOptions } from './StackHeaderLeft'
import { StackHeaderRight, appendStackHeaderRightPropsToOptions } from './StackHeaderRight'
import {
  appendStackHeaderSearchBarPropsToOptions,
  StackHeaderSearchBar,
} from './StackHeaderSearchBar'
import { appendStackHeaderTitlePropsToOptions, StackHeaderTitle } from './StackHeaderTitle'
import { isChildOfType } from '../../utils/children'

export interface StackHeaderProps {
  children?: ReactNode
  hidden?: boolean
  asChild?: boolean
  blurEffect?: ScreenStackHeaderConfigProps['blurEffect']
  style?: StyleProp<{
    color?: ColorValue
    backgroundColor?: ScreenStackHeaderConfigProps['backgroundColor']
    shadowColor?: undefined | 'transparent'
  }>
  largeStyle?: StyleProp<{
    backgroundColor?: ScreenStackHeaderConfigProps['largeTitleBackgroundColor']
    shadowColor?: undefined | 'transparent'
  }>
}

/**
 * Configuration component for stack headers.
 * Use child components to configure different parts of the header.
 *
 * @example
 * ```tsx
 * <Stack.Header blurEffect="regular">
 *   <Stack.Header.Title large>My Title</Stack.Header.Title>
 *   <Stack.Header.Right asChild>
 *     <Button>Action</Button>
 *   </Stack.Header.Right>
 * </Stack.Header>
 * ```
 */
export function StackHeaderComponent(_props: StackHeaderProps) {
  return null
}

export function appendStackHeaderPropsToOptions(
  options: NativeStackNavigationOptions,
  props: StackHeaderProps
): NativeStackNavigationOptions {
  const flattenedStyle = StyleSheet.flatten(props.style)
  const flattenedLargeStyle = StyleSheet.flatten(props.largeStyle)

  if (props.hidden) {
    return { ...options, headerShown: false }
  }

  if (props.asChild) {
    return { ...options, header: () => props.children }
  }

  const isTransparent = flattenedStyle?.backgroundColor === 'transparent'
  const hasCustomShadow = flattenedStyle?.shadowColor !== undefined
  const hasBackgroundColor = flattenedStyle?.backgroundColor !== undefined
  const hasLargeBackgroundColor = flattenedLargeStyle?.backgroundColor !== undefined

  let updatedOptions: NativeStackNavigationOptions = {
    ...options,
    headerShown: !props.hidden,
    headerBlurEffect: props.blurEffect,
    // Set headerTransparent when backgroundColor is 'transparent'
    // This works on both iOS and Android for normal headers
    // Note: When using SearchBar on iOS, if you don't have a ScrollView with
    // contentInsetAdjustmentBehavior="automatic", set headerTransparent: false in options
    ...(isTransparent && { headerTransparent: true }),
    // Only set header styles when explicitly configured to avoid interfering with native defaults
    ...(hasBackgroundColor && {
      headerStyle: { backgroundColor: flattenedStyle.backgroundColor as string },
    }),
    ...(hasLargeBackgroundColor && {
      headerLargeStyle: { backgroundColor: flattenedLargeStyle.backgroundColor as string },
    }),
    // Only set shadow visibility when explicitly configured
    ...(hasCustomShadow && { headerShadowVisible: flattenedStyle?.shadowColor !== 'transparent' }),
    ...(flattenedLargeStyle?.shadowColor !== undefined && {
      headerLargeTitleShadowVisible: flattenedLargeStyle?.shadowColor !== 'transparent',
    }),
  }

  function appendChildOptions(child: React.ReactElement, options: NativeStackNavigationOptions) {
    let result = options
    if (isChildOfType(child, StackHeaderTitle)) {
      result = appendStackHeaderTitlePropsToOptions(result, child.props)
    } else if (isChildOfType(child, StackHeaderLeft)) {
      result = appendStackHeaderLeftPropsToOptions(result, child.props)
    } else if (isChildOfType(child, StackHeaderRight)) {
      result = appendStackHeaderRightPropsToOptions(result, child.props)
    } else if (isChildOfType(child, StackHeaderBackButton)) {
      result = appendStackHeaderBackButtonPropsToOptions(result, child.props)
    } else if (isChildOfType(child, StackHeaderSearchBar)) {
      result = appendStackHeaderSearchBarPropsToOptions(result, child.props)
    } else {
      console.warn(
        `Warning: Unknown child element passed to Stack.Header: ${(child.type as { name: string }).name ?? child.type}`
      )
    }
    return result
  }

  Children.forEach(props.children, (child) => {
    if (isValidElement(child)) {
      updatedOptions = appendChildOptions(child, updatedOptions)
    }
  })

  return updatedOptions
}
