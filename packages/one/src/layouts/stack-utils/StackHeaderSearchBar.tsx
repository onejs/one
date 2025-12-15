import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import type { SearchBarProps } from 'react-native-screens'

export interface StackHeaderSearchBarProps extends SearchBarProps {}

/**
 * Configuration component for adding a search bar to stack headers.
 */
export function StackHeaderSearchBar(_props: StackHeaderSearchBarProps) {
  return null
}

export function appendStackHeaderSearchBarPropsToOptions(
  options: NativeStackNavigationOptions,
  props: StackHeaderSearchBarProps
): NativeStackNavigationOptions {
  return {
    ...options,
    headerSearchBarOptions: props,
  }
}
