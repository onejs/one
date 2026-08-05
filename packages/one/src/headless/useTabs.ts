'use client'

import { use, useMemo, type ReactElement } from 'react'

import { appendBaseUrl } from '../fork/getPathFromState-mods'
import { stripGroupSegmentsFromPath } from '../router/matchers'
import { TabTriggerMapContext } from '../ui/TabContext'
import { useNavigatorContext } from '../views/Navigator'
import type { UseTabsResult } from './types'

type TabsDescriptor = {
  options: Record<string, any>
  render: () => ReactElement
}

export function useTabs(): UseTabsResult {
  const { state, descriptorsRef } = useNavigatorContext()
  const triggerMap = use(TabTriggerMapContext)
  const descriptors = descriptorsRef.current

  return useMemo(() => {
    const screens = state.routes.map((route, index) => {
      const descriptor = descriptors[route.key] as TabsDescriptor
      const config = triggerMap[route.name]

      return {
        key: route.key,
        name: route.name,
        params: (route.params ?? {}) as Record<string, any>,
        href: config ? stripGroupSegmentsFromPath(appendBaseUrl(config.href)) : '',
        isFocused: index === state.index,
        keepMounted: descriptor.options.keepMounted === true,
        options: descriptor.options,
        element: descriptor.render(),
      }
    })

    return { screens, focused: screens[state.index]! }
  }, [descriptors, state, triggerMap])
}
