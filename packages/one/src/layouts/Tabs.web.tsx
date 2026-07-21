'use client'

import type { ParamListBase } from '@react-navigation/core'
import { useNavigationBuilder } from '@react-navigation/core'
import {
  type TabActionHelpers,
  type TabNavigationState,
  TabRouter,
  type TabRouterOptions,
} from '@react-navigation/routers'
import { Children, Fragment, forwardRef, type ReactNode, useMemo, useRef } from 'react'
import { getPathFromState } from '../fork/getPathFromState'
import { getCustomNavigatorChildren, isNavigatorConfigChild } from '../headless/children'
import { devHeadlessNote } from '../headless/devHeadlessNote'
import { useTabs } from '../headless/useTabs'
import { getResolvedLinking } from '../router/linkingConfig'
import { TabTriggerMapContext } from '../ui/TabContext'
import { NavigatorContext } from '../views/Navigator'
import { Protected } from '../views/Protected'
import { Screen } from '../views/Screen'
import { withLayoutContext } from './withLayoutContext'

type TabsEventMap = {
  tabPress: { data: undefined; canPreventDefault: true }
  tabLongPress: { data: undefined }
}

type WebTabsNavigatorProps = {
  children?: ReactNode
  headlessChildren?: ReactNode[]
  initialRouteName?: string
  screenOptions?: any
  id?: string
  [key: string]: any
}

type TabsProps = Omit<WebTabsNavigatorProps, 'headlessChildren'> & {
  render?: unknown
  tabBar?: unknown
}

function WebTabsNavigator({
  children,
  headlessChildren,
  initialRouteName,
  screenOptions,
  id,
  ...rest
}: WebTabsNavigatorProps) {
  const { state, navigation, descriptors, NavigationContent } = useNavigationBuilder<
    TabNavigationState<ParamListBase>,
    TabRouterOptions,
    TabActionHelpers<ParamListBase>,
    Record<string, any>,
    TabsEventMap
  >(TabRouter, {
    ...(rest as any),
    children,
    initialRouteName,
    screenOptions,
  })
  const descriptorsRef = useRef(descriptors)
  descriptorsRef.current = descriptors
  const linking = getResolvedLinking()

  const navigatorContextValue = useMemo(
    () => ({
      contextKey: id ?? '',
      state,
      navigation,
      descriptorsRef,
      router: TabRouter,
    }),
    [id, navigation, state]
  )

  const triggerMap = useMemo(() => {
    return Object.fromEntries(
      state.routes.map((route, index) => {
        const options = descriptors[route.key]?.options ?? {}
        const href =
          typeof options.href === 'string'
            ? options.href
            : (linking?.getPathFromState ?? getPathFromState)(
                { ...state, index },
                linking?.config
              )

        return [
          route.name,
          {
            type: 'internal',
            name: route.name,
            href,
            action: {
              type: 'JUMP_TO',
              payload: { name: route.name },
            },
            index,
          },
        ]
      })
    )
  }, [descriptors, linking, state])

  return (
    <NavigationContent>
      <TabTriggerMapContext.Provider value={triggerMap as any}>
        <NavigatorContext.Provider value={navigatorContextValue as any}>
          <HeadlessTabsView customChildren={headlessChildren} />
        </NavigatorContext.Provider>
      </TabTriggerMapContext.Provider>
    </NavigationContent>
  )
}

function HeadlessTabsView({ customChildren }: { customChildren?: ReactNode[] }) {
  const { focused } = useTabs()
  devHeadlessNote('Tabs')

  if (customChildren?.length) {
    return <Fragment>{customChildren}</Fragment>
  }

  return focused.element
}

const RNTabs = withLayoutContext(WebTabsNavigator)

const TabsWithChildren = forwardRef<unknown, TabsProps>(function TabsWithChildren(
  { children, ...props },
  ref
) {
  const configChildren = Children.toArray(children).filter(isNavigatorConfigChild)
  const customChildren = getCustomNavigatorChildren(children)

  return (
    <RNTabs {...props} ref={ref} headlessChildren={customChildren}>
      {configChildren}
    </RNTabs>
  )
})

export const Tabs = Object.assign(TabsWithChildren, {
  Protected,
  Screen,
})

export default Tabs
