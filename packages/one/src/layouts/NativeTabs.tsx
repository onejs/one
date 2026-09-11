import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import React from 'react'

import { Protected } from '../views/Protected'
import { withLayoutContext } from './withLayoutContext'

// v8: native bottom tabs are the default implementation of createBottomTabNavigator
const NativeBottomTabNavigator = createBottomTabNavigator().Navigator

type NativeTabsType = ReturnType<typeof withLayoutContext> & {
  Protected: typeof Protected
}

export const NativeTabs = Object.assign(withLayoutContext(NativeBottomTabNavigator), {
  Protected,
}) as NativeTabsType

export default NativeTabs
