import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useIsFocused } from '@react-navigation/native'
import type { ReactElement, ReactNode } from 'react'
import { SharedTransitionBoundary } from 'react-native-reanimated'

/**
 * Returns a Stack navigator factory. On native this is the stock
 * `@react-navigation/native-stack`; on web this is replaced via the
 * `.web.ts` sibling with the headless navigator.
 */
export const createStackNavigator = createNativeStackNavigator

// reanimated matches sharedTransitionTag views only inside an active boundary,
// so the focused screen's boundary is the one a push or pop morphs into
function SharedTransitionScreen({ children }: { children: ReactNode }) {
  return (
    <SharedTransitionBoundary isActive={useIsFocused()}>
      {children}
    </SharedTransitionBoundary>
  )
}

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
