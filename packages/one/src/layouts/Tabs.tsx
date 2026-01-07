import {
  BottomTabBar,
  type BottomTabBarProps,
  type BottomTabNavigationEventMap,
  type BottomTabNavigationOptions,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs'
import type { ParamListBase, TabNavigationState } from '@react-navigation/native'
import { Platform, Pressable } from 'react-native'

import type { OneRouter } from '../interfaces/router'
import { Link } from '../link/Link'
import { withLayoutContext } from './withLayoutContext'

const TabBar = ({ state, ...restProps }: BottomTabBarProps) => {
  /**
   * With React Navigation v7, spacial routes such as +not-found and _sitemap are being added to `state.routes`, but we don't want them to be shown in the tab bar.
   */

  // TODO due to adding onlyMatching, we can remove this now i think (need to make sure)

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

// This is the only way to access the navigator.
const BottomTabNavigator = createBottomTabNavigator().Navigator

type BottomTabNavigationOptionsWithHref = BottomTabNavigationOptions & {
  href?: OneRouter.Href | null
}

export const Tabs = withLayoutContext<
  BottomTabNavigationOptionsWithHref,
  typeof BottomTabNavigator,
  TabNavigationState<ParamListBase>,
  BottomTabNavigationEventMap
>(
  BottomTabNavigator,
  (screens) => {
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
  },
  { props: { tabBar: TabBar } }
)

export default Tabs
