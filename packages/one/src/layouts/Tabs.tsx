import {
  type BottomTabNavigationEventMap,
  type BottomTabNavigationOptions,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs'
import type { ParamListBase, TabNavigationState } from '@react-navigation/native'

import type { OneRouter } from '../interfaces/router'
import { Protected } from '../views/Protected'
import { withLayoutContext } from './withLayoutContext'

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
  return screens.map((screen) => {
    if (typeof screen.options !== 'function' && screen.options?.href !== undefined) {
      const { href, ...options } = screen.options
      return {
        ...screen,
        options,
      }
    }
    return screen
  })
})

type TabsType = ReturnType<typeof withLayoutContext> & { Protected: typeof Protected }

export const Tabs: TabsType = Object.assign(RNTabs, {
  Protected,
  Screen: RNTabs.Screen,
}) as TabsType

export default Tabs
