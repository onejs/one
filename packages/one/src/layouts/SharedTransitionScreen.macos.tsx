import type { ReactNode } from 'react'

// macos has no reanimated yet, so there are no shared transitions to bound
export function SharedTransitionScreen({ children }: { children: ReactNode }) {
  return children
}
