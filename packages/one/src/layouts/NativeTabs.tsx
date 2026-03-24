import type { ParamListBase, TabNavigationState } from '@react-navigation/native'
import type React from 'react'

import { Protected } from '../views/Protected'
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

function createNativeTabs(): NativeTabsType {
  if (!NativeBottomTabNavigator) {
    throw new Error(
      'NativeTabs requires @bottom-tabs/react-navigation and react-native-bottom-tabs.\n' +
        'Install: npx expo install @bottom-tabs/react-navigation react-native-bottom-tabs'
    )
  }

  return Object.assign(withLayoutContext(NativeBottomTabNavigator), {
    Protected,
  }) as NativeTabsType
}

let _nativeTabs: NativeTabsType | null = null

export const NativeTabs = new Proxy({} as NativeTabsType, {
  get(_, prop) {
    if (!_nativeTabs) _nativeTabs = createNativeTabs()
    return (_nativeTabs as any)[prop]
  },
  apply(_, thisArg, args) {
    if (!_nativeTabs) _nativeTabs = createNativeTabs()
    return (_nativeTabs as any).apply(thisArg, args)
  },
})

export default NativeTabs
