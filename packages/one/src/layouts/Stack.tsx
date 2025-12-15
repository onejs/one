import type { ParamListBase, StackNavigationState } from '@react-navigation/native'
import {
  createNativeStackNavigator,
  type NativeStackNavigationEventMap,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack'

import { StackScreen, StackHeader } from './stack-utils'
import { withLayoutContext } from './withLayoutContext'

const NativeStackNavigator = createNativeStackNavigator().Navigator

const StackBase = withLayoutContext<
  NativeStackNavigationOptions,
  typeof NativeStackNavigator,
  StackNavigationState<ParamListBase>,
  NativeStackNavigationEventMap
>(NativeStackNavigator)

export const Stack = Object.assign(StackBase, {
  Screen: StackScreen,
  Header: StackHeader,
})

export default Stack
