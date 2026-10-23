import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { ReactElement, ReactNode } from 'react'

/**
 * The stock `@react-navigation/native-stack`, as on ios and android. macos has
 * no reanimated yet, so screens get no shared transition boundary.
 */
export const createStackNavigator = createNativeStackNavigator

export function getStackNavigatorProps<Args extends { children: ReactElement }>(
  _children: ReactNode,
  screenLayout?: (props: Args) => ReactElement
) {
  return screenLayout ? { screenLayout } : {}
}
