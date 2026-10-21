import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { ReactElement, ReactNode } from 'react'
import { SharedTransitionScreen } from './SharedTransitionScreen'

/**
 * Returns a Stack navigator factory. On native this is the stock
 * `@react-navigation/native-stack`; on web this is replaced via the
 * `.web.ts` sibling with the headless navigator.
 */
export const createStackNavigator = createNativeStackNavigator

export function getStackNavigatorProps<Args extends { children: ReactElement }>(
  _children: ReactNode,
  screenLayout?: (props: Args) => ReactElement
) {
  return {
    screenLayout: (props: Args) => (
      <SharedTransitionScreen>
        {screenLayout ? screenLayout(props) : props.children}
      </SharedTransitionScreen>
    ),
  }
}
