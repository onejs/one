import {
  type BottomTabNavigationEventMap,
  type BottomTabNavigationOptions,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs'
import type { ParamListBase, TabNavigationState } from '@react-navigation/native'

import { Protected } from '../views/Protected'
import { processNativeTabsScreens } from './nativeTabsOptions'
import { withLayoutContext } from './withLayoutContext'

const BottomTabNavigator = createBottomTabNavigator().Navigator

const RNTabs = withLayoutContext<
  BottomTabNavigationOptions,
  typeof BottomTabNavigator,
  TabNavigationState<ParamListBase>,
  BottomTabNavigationEventMap
>(BottomTabNavigator, processNativeTabsScreens)

type TabsType = ReturnType<typeof withLayoutContext> & { Protected: typeof Protected }

export const Tabs: TabsType = Object.assign(RNTabs, {
  Protected,
  Screen: RNTabs.Screen,
}) as TabsType

export default Tabs
