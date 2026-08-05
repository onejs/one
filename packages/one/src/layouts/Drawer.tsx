import {
  createDrawerNavigator,
  type DrawerNavigationEventMap,
  type DrawerNavigationOptions,
} from '@react-navigation/drawer'
import type { DrawerNavigationState, ParamListBase } from '@react-navigation/native'
import React, { type ComponentProps } from 'react'

import { withLayoutContext } from './withLayoutContext'

const DrawerNavigator = createDrawerNavigator().Navigator

const RNDrawer = withLayoutContext<
  DrawerNavigationOptions,
  typeof DrawerNavigator,
  DrawerNavigationState<ParamListBase>,
  DrawerNavigationEventMap
>(DrawerNavigator)

const DrawerWithRender = React.forwardRef<unknown, ComponentProps<typeof RNDrawer>>(
  (props, ref) => <RNDrawer {...(props as any)} ref={ref} />
)

// Preserve withLayoutContext's static Screen so user code like
// `<Drawer.Screen ... />` keeps working through the render wrapper.
export const Drawer = Object.assign(DrawerWithRender, {
  Screen: RNDrawer.Screen,
})

export default Drawer
