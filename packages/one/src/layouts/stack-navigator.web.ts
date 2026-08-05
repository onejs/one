import type { ReactNode } from 'react'

import { getCustomNavigatorChildren } from '../headless/children'
import { createWebStackNavigator } from '../router/web/WebStackNavigator'

export const createStackNavigator = createWebStackNavigator

export function getStackNavigatorProps(children: ReactNode) {
  const headlessChildren = getCustomNavigatorChildren(children)
  return headlessChildren.length ? { headlessChildren } : {}
}
