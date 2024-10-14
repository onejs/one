import { withLayoutContext } from 'one'
import {
  createNativeBottomTabNavigator,
  type NativeBottomTabNavigationEventMap,
  NativeBottomTabNavigationOptions,
  // @ts-ignore
} from 'react-native-bottom-tabs/react-navigation'

// This should be imported from react-native-bottom-tabs/react-navigation which is
// exporting NativeBottomTabNavigationOptions but the types seem to be broken at
// at the moment..
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs'

import type { ParamListBase, TabNavigationState } from '@react-navigation/native'

const { Navigator } = createNativeBottomTabNavigator()

export const NativeTabs = withLayoutContext<
  BottomTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  NativeBottomTabNavigationEventMap
>(Navigator)
