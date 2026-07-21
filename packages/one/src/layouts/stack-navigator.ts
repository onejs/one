import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { ReactNode } from 'react'

/**
 * Returns a Stack navigator factory. On native this is the stock
 * `@react-navigation/native-stack`; on web this is replaced via the
 * `.web.ts` sibling with the headless navigator.
 */
export const createStackNavigator = createNativeStackNavigator

export function getStackNavigatorProps(_children: ReactNode) {
  return {}
}
