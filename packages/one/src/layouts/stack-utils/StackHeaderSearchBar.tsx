import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import type { SearchBarProps } from 'react-native-screens'

import { NAVIGATOR_CONFIG } from '../../headless/children'

export interface StackHeaderSearchBarProps extends SearchBarProps {}

/**
 * Configuration component for adding a search bar to stack headers.
 */
export function StackHeaderSearchBar(_props: StackHeaderSearchBarProps) {
  return null
}

Object.assign(StackHeaderSearchBar, { [NAVIGATOR_CONFIG]: true })

export function appendStackHeaderSearchBarPropsToOptions(
  options: NativeStackNavigationOptions,
  props: StackHeaderSearchBarProps
): NativeStackNavigationOptions {
  return {
    ...options,
    headerSearchBarOptions: props,
  }
}
