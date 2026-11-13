import {
  type BottomTabNavigationEventMap,
  type BottomTabNavigationOptions,
  type BottomTabNavigatorProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs'
import type { ParamListBase, TabNavigationState } from '@react-navigation/native'

import { Protected } from '../views/Protected'
import { processNativeTabsScreens } from './nativeTabsOptions'
import {
  type LayoutNavigator,
  type LayoutScreen,
  withLayoutContext,
} from './withLayoutContext'

const BottomTabNavigator = createBottomTabNavigator().Navigator

export type TabsScreenOptions = BottomTabNavigationOptions & {
  /** Web only: the tab's link target. Native layouts reject it. */
  href?: string | null
  /** Web only: keep the tab's subtree mounted after it is left. */
  keepMounted?: boolean
}

const RNTabs = withLayoutContext<
  TabsScreenOptions,
  typeof BottomTabNavigator,
  TabNavigationState<ParamListBase>,
  BottomTabNavigationEventMap
>(BottomTabNavigator, processNativeTabsScreens)

type TabsType = LayoutNavigator<BottomTabNavigatorProps, TabsScreenOptions> & {
  Screen: LayoutScreen<
    TabsScreenOptions,
    TabNavigationState<ParamListBase>,
    BottomTabNavigationEventMap
  >
  Protected: typeof Protected
}

export const Tabs: TabsType = Object.assign(RNTabs, {
  Protected,
  Screen: RNTabs.Screen,
}) as TabsType

export default Tabs
