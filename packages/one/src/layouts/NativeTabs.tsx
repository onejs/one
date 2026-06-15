import type { ParamListBase, TabNavigationState } from '@react-navigation/native'
import React from 'react'

import { Protected } from '../views/Protected'
import { Screen } from '../views/Screen'
import { withLayoutContext } from './withLayoutContext'

let NativeBottomTabNavigator: React.ComponentType<any> | null = null

try {
  const mod = require('@bottom-tabs/react-navigation')
  NativeBottomTabNavigator = mod.createNativeBottomTabNavigator().Navigator
} catch {
  // @bottom-tabs/react-navigation not installed
}

type NativeTabsType = ReturnType<typeof withLayoutContext> & {
  Protected: typeof Protected
}

const missingNativeTabsMessage =
  'NativeTabs requires @bottom-tabs/react-navigation and react-native-bottom-tabs.\n' +
  'Install: npx expo install @bottom-tabs/react-navigation react-native-bottom-tabs'

const MissingNativeTabs = React.forwardRef<unknown, any>(function MissingNativeTabs(): never {
  throw new Error(missingNativeTabsMessage)
})

function createNativeTabs(): NativeTabsType {
  if (!NativeBottomTabNavigator) {
    return Object.assign(MissingNativeTabs, {
      Protected,
      Screen,
    }) as NativeTabsType
  }

  return Object.assign(withLayoutContext(NativeBottomTabNavigator), {
    Protected,
  }) as NativeTabsType
}

export const NativeTabs = createNativeTabs()

export default NativeTabs
