import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useIsFocused } from '@react-navigation/native'
import type { ReactElement, ReactNode } from 'react'

/**
 * Returns a Stack navigator factory. On native this is the stock
 * `@react-navigation/native-stack`; on web this is replaced via the
 * `.web.ts` sibling with the headless navigator.
 */
export const createStackNavigator = createNativeStackNavigator

// reanimated is an optional peer, so an app without it gets no shared transitions
let SharedTransitionBoundary:
  | typeof import('react-native-reanimated').SharedTransitionBoundary
  | undefined
try {
  SharedTransitionBoundary = require('react-native-reanimated').SharedTransitionBoundary
} catch {}

// reanimated matches sharedTransitionTag views only inside an active boundary,
// so the focused screen's boundary is the one a push or pop morphs into
function SharedTransitionScreen({
  Boundary,
  children,
}: {
  Boundary: NonNullable<typeof SharedTransitionBoundary>
  children: ReactNode
}) {
  return <Boundary isActive={useIsFocused()}>{children}</Boundary>
}

export function getStackNavigatorProps<Args extends { children: ReactElement }>(
  _children: ReactNode,
  screenLayout?: (props: Args) => ReactElement
) {
  const Boundary = SharedTransitionBoundary
  if (!Boundary) return { screenLayout }
  return {
    screenLayout: (props: Args) => (
      <SharedTransitionScreen Boundary={Boundary}>
        {screenLayout ? screenLayout(props) : props.children}
      </SharedTransitionScreen>
    ),
  }
}
