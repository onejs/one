import {
  createNativeBottomTabNavigator,
  type NativeBottomTabNavigationEventMap,
  type NativeBottomTabNavigationOptions,
} from '@bottom-tabs/react-navigation'
import type { ParamListBase, TabNavigationState } from '@react-navigation/native'
import type React from 'react'

import { withLayoutContext } from './withLayoutContext'

// typed as ComponentType<any> because @bottom-tabs/react-navigation doesn't export
// NativeBottomTabNavigatorProps, causing TS2742 on build. the actual typing comes
// from the withLayoutContext generics below, not from the Navigator's own props.
const NativeBottomTabNavigator: React.ComponentType<any> =
  createNativeBottomTabNavigator().Navigator

export const NativeTabs = withLayoutContext<
  NativeBottomTabNavigationOptions,
  typeof NativeBottomTabNavigator,
  TabNavigationState<ParamListBase>,
  NativeBottomTabNavigationEventMap
>(NativeBottomTabNavigator)

export default NativeTabs
