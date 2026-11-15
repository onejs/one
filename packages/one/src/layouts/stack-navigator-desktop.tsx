import type { ReactElement, ReactNode } from 'react'

export function getStackNavigatorProps<Args extends { children: ReactElement }>(
  _children: ReactNode,
  screenLayout?: (props: Args) => ReactElement
) {
  return screenLayout ? { screenLayout } : {}
}
