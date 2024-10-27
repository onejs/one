import { withLayoutContext } from 'one'
import {
  createNativeBottomTabNavigator,
  type NativeBottomTabNavigationEventMap,
} from 'react-native-bottom-tabs/react-navigation'

import type { BottomTabNavigationOptions } from 'react-native-bottom-tabs'

import type { ParamListBase, TabNavigationState } from '@react-navigation/native'

const { Navigator } = createNativeBottomTabNavigator()

export const NativeTabs = withLayoutContext<
  BottomTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  NativeBottomTabNavigationEventMap
>(Navigator)
