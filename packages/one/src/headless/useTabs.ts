'use client'

import { useMemo, type ReactElement } from 'react'

import { useTabTrigger } from '../ui/useTabTrigger'
import { useNavigatorContext } from '../views/Navigator'
import type { UseTabsResult } from './types'

type TabsDescriptor = {
  options: Record<string, any>
  render: () => ReactElement
}

export function useTabs(): UseTabsResult {
  const { state, descriptorsRef } = useNavigatorContext()
  const { getTrigger, switchTab } = useTabTrigger({ name: '' })
  const descriptors = descriptorsRef.current

  return useMemo(() => {
    const tabs = state.routes.map((route, index) => {
      const descriptor = descriptors[route.key] as TabsDescriptor
      const trigger = getTrigger(route.name)

      return {
        key: route.key,
        name: route.name,
        params: (route.params ?? {}) as Record<string, any>,
        href: trigger?.resolvedHref ?? '',
        isFocused: index === state.index,
        keepMounted: descriptor.options.keepMounted === true,
        options: descriptor.options,
        element: descriptor.render(),
      }
    })

    return {
      tabs,
      focused: tabs[state.index]!,
      navigation: {
        switchTab: (name: string) => switchTab(name, {}),
      },
    }
  }, [descriptors, getTrigger, state, switchTab])
}
