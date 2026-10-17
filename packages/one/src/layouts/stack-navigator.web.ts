import type { ReactNode } from 'react'

import { getCustomNavigatorChildren } from '../headless/children'
import { createWebStackNavigator } from '../router/web/WebStackNavigator'

export const createStackNavigator = createWebStackNavigator

export function getStackNavigatorProps(children: ReactNode, screenLayout?: unknown) {
  const headlessChildren = getCustomNavigatorChildren(children)
  return {
    ...(screenLayout ? { screenLayout } : null),
    ...(headlessChildren.length ? { headlessChildren } : null),
  }
}
