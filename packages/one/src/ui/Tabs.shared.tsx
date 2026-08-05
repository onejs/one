import type { RouterFactory } from '@react-navigation/native'
import {
  type DefaultNavigatorOptions,
  LinkingContext,
  type ParamListBase,
  type TabActionHelpers,
  type TabNavigationState,
  type TabRouterOptions,
  useNavigationBuilder,
} from '@react-navigation/native'
import {
  Children,
  type ComponentProps,
  Fragment,
  isValidElement,
  type MutableRefObject,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
  use,
  useMemo,
  useRef,
} from 'react'
import type { ViewProps } from 'react-native'

import { useRouteInfo } from '../hooks'
import { resolveHref } from '../link/href'
import { useContextKey, useRouteNode } from '../router/Route'
import { shouldLinkExternally } from '../utils/url'
import { NavigatorContext } from '../views/Navigator'
import { type ScreenTrigger, triggersToScreens } from './common'
import {
  type ExpoTabsScreenOptions,
  type TabNavigationEventMap,
  type TabsContextValue,
  TabTriggerMapContext,
} from './TabContext'
import { isTabList } from './TabList'
import { ExpoTabRouter, type ExpoTabRouterOptions } from './TabRouter'
import { isTabSlot } from './TabSlot'
import { isTabTrigger } from './TabTrigger'
import { useComponent } from './useComponent'

type NavigatorContextValue = {
  contextKey: string
  state: ReturnType<typeof useNavigationBuilder>['state']
  navigation: ReturnType<typeof useNavigationBuilder>['navigation']
  descriptorsRef: MutableRefObject<ReturnType<typeof useNavigationBuilder>['descriptors']>
  router: RouterFactory<any, any, any>
}

export type UseTabsOptions = Omit<
  DefaultNavigatorOptions<
    ParamListBase,
    any,
    TabNavigationState<any>,
    ExpoTabsScreenOptions,
    TabNavigationEventMap,
    any
  >,
  'children'
> & {
  backBehavior?: TabRouterOptions['backBehavior']
}

export type TabsProps = ViewProps & {
  asChild?: boolean
  options?: UseTabsOptions
}

export type UseTabsWithChildrenOptions = PropsWithChildren<UseTabsOptions>

export type UseTabsWithTriggersOptions = UseTabsOptions & {
  triggers: ScreenTrigger[]
}

export function useTabsWithChildren(options: UseTabsWithChildrenOptions) {
  const { children, ...rest } = options
  return useTabsWithTriggers({
    triggers: parseTriggersFromChildren(children),
    ...rest,
  })
}

export function useTabsWithTriggers(
  options: UseTabsWithTriggersOptions
): TabsContextValue {
  const { triggers, ...rest } = options
  const parentTriggerMap = use(TabTriggerMapContext)
  const routeNode = useRouteNode()
  const contextKey = useContextKey()
  const linking = use(LinkingContext).options
  const routeInfo = useRouteInfo()

  if (!routeNode || !linking) {
    throw new Error('No RouteNode. This is likely a bug in one router.')
  }

  const { children, triggerMap } = triggersToScreens(
    triggers,
    routeNode,
    linking,
    routeNode.initialRouteName,
    parentTriggerMap,
    routeInfo,
    contextKey
  )

  const navigatorContext = useNavigationBuilder<
    TabNavigationState<any>,
    ExpoTabRouterOptions,
    TabActionHelpers<ParamListBase>,
    ExpoTabsScreenOptions,
    TabNavigationEventMap
  >(ExpoTabRouter, {
    children,
    ...rest,
    triggerMap,
    id: contextKey,
    initialRouteName: routeNode.initialRouteName,
  })

  const {
    state,
    descriptors,
    navigation,
    describe,
    NavigationContent: RNNavigationContent,
  } = navigatorContext
  const descriptorsRef = useRef(descriptors)
  descriptorsRef.current = descriptors

  const navigatorContextValue = useMemo(
    () => ({
      state,
      navigation,
      contextKey,
      router: ExpoTabRouter,
      descriptorsRef,
    }),
    [state, navigation, contextKey]
  ) as unknown as NavigatorContextValue

  const NavigationContent = useComponent((children: ReactNode) => (
    <TabTriggerMapContext.Provider value={triggerMap}>
      <NavigatorContext.Provider value={navigatorContextValue}>
        <RNNavigationContent>{children}</RNNavigationContent>
      </NavigatorContext.Provider>
    </TabTriggerMapContext.Provider>
  )) as TabsContextValue['NavigationContent']

  return { state, descriptors, navigation, NavigationContent, describe }
}

function parseTriggersFromChildren(
  children: ReactNode,
  screenTriggers: ScreenTrigger[] = [],
  isInTabList = false
) {
  Children.forEach(children, (child) => {
    if (!child || !isValidElement(child) || isTabSlot(child)) return

    if (isFragment(child) && typeof child.props.children !== 'function') {
      return parseTriggersFromChildren(
        child.props.children,
        screenTriggers,
        isInTabList || isTabList(child)
      )
    }

    if (isTabList(child) && typeof child.props.children !== 'function') {
      let children = child.props.children

      if (
        child.props.asChild &&
        isValidElement(children) &&
        children.props &&
        typeof children.props === 'object' &&
        'children' in children.props
      ) {
        children = children.props.children as ReactNode
      }

      return parseTriggersFromChildren(
        children,
        screenTriggers,
        isInTabList || isTabList(child)
      )
    }

    if (!isInTabList || !isTabTrigger(child)) return

    const { href, name } = child.props

    if (!href) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `<TabTrigger name={${name}}> does not have a 'href' prop. TabTriggers within a <TabList /> are required to have an href.`
        )
      }
      return
    }

    const resolvedHref = resolveHref(href)

    if (shouldLinkExternally(resolvedHref)) {
      screenTriggers.push({ type: 'external', name, href: resolvedHref })
      return
    }

    if (!name) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `<TabTrigger> does not have a 'name' prop. TabTriggers within a <TabList /> are required to have a name.`
        )
      }
      return
    }

    screenTriggers.push({ type: 'internal', href: resolvedHref, name })
  })

  return screenTriggers
}

function isFragment(
  child: ReactElement<any>
): child is ReactElement<ComponentProps<typeof Fragment>> {
  return child.type === Fragment
}
