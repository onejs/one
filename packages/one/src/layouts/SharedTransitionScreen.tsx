import { useIsFocused } from '@react-navigation/native'
import type { ReactNode } from 'react'
import { SharedTransitionBoundary } from 'react-native-reanimated'

// reanimated matches sharedTransitionTag views only inside an active boundary,
// so the focused screen's boundary is the one a push or pop morphs into
export function SharedTransitionScreen({ children }: { children: ReactNode }) {
  return (
    <SharedTransitionBoundary isActive={useIsFocused()}>
      {children}
    </SharedTransitionBoundary>
  )
}
