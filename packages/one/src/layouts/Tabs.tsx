import {
  BottomTabBar,
  type BottomTabBarProps,
  type BottomTabNavigationEventMap,
  type BottomTabNavigationOptions,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs'
import type { ParamListBase, TabNavigationState } from '@react-navigation/native'
import React, { useMemo, type ComponentProps } from 'react'
import { Platform, Pressable } from 'react-native'

import type { OneRouter } from '../interfaces/router'
import { Link } from '../link/Link'
import { Protected } from '../views/Protected'
import { withLayoutContext } from './withLayoutContext'

const DefaultTabBar = ({ state, ...restProps }: BottomTabBarProps) => {
  /**
   * With React Navigation v7, special routes such as +not-found and _sitemap
   * are being added to `state.routes`, but we don't want them to be shown in
   * the tab bar.
   */
  const filteredRoutes = state.routes.filter(
    (r) => r.name !== '+not-found' && !r.name.startsWith('_sitemap')
  )

  return (
    <BottomTabBar
      state={{
        ...state,
        routes: filteredRoutes,
      }}
      {...restProps}
    />
  )
}

const BottomTabNavigator = createBottomTabNavigator().Navigator

type BottomTabNavigationOptionsWithHref = BottomTabNavigationOptions & {
  href?: OneRouter.Href | null
}

const RNTabs = withLayoutContext<
  BottomTabNavigationOptionsWithHref,
  typeof BottomTabNavigator,
  TabNavigationState<ParamListBase>,
  BottomTabNavigationEventMap
>(BottomTabNavigator, (screens) => {
  // Support the `href` shortcut prop.
  return screens.map((screen) => {
    if (typeof screen.options !== 'function' && screen.options?.href !== undefined) {
      const { href, ...options } = screen.options
      if (options.tabBarButton) {
        throw new Error('Cannot use `href` and `tabBarButton` together.')
      }
      return {
        ...screen,
        options: {
          ...options,
          tabBarButton: (props) => {
            if (href == null) {
              return null
            }
            const children =
              Platform.OS === 'web' ? (
                props.children
              ) : (
                <Pressable>{props.children}</Pressable>
              )
            return (
              <Link
                {...(props as any)}
                style={[{ display: 'flex' }, props.style]}
                href={href}
                asChild={Platform.OS !== 'web'}
                // biome-ignore lint/correctness/noChildrenProp: children prop needed for asChild pattern
                children={children}
              />
            )
          },
        },
      }
    }
    return screen
  })
})

const TabsWithRender = React.forwardRef<unknown, ComponentProps<typeof RNTabs>>(
  (props, ref) => {
    const { tabBar, ...rest } = props as any
    return <RNTabs {...rest} ref={ref} tabBar={tabBar ?? DefaultTabBar} />
  }
)

export const Tabs = Object.assign(TabsWithRender, {
  Protected,
  // Preserve withLayoutContext's static Screen so user code like
  // `<Tabs.Screen ... />` keeps working through the render wrapper.
  Screen: RNTabs.Screen,
})

export default Tabs
