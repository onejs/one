import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { withLayoutContext } from 'one'

// v8: native bottom tabs are the default on iOS/Android via @react-navigation/bottom-tabs
export const NativeTabs = withLayoutContext(createBottomTabNavigator().Navigator)
