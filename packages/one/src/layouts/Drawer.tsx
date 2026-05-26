import {
  createDrawerNavigator,
  type DrawerNavigationEventMap,
  type DrawerNavigationOptions,
} from '@react-navigation/drawer'
import type { DrawerNavigationState, ParamListBase } from '@react-navigation/native'
import React, { useMemo, type ComponentProps } from 'react'
import { Platform } from 'react-native'

import { getRenderingConfig, type DrawerRender } from '../router/renderingRegistry'
import { withLayoutContext } from './withLayoutContext'

const DrawerNavigator = createDrawerNavigator().Navigator

const RNDrawer = withLayoutContext<
  DrawerNavigationOptions,
  typeof DrawerNavigator,
  DrawerNavigationState<ParamListBase>,
  DrawerNavigationEventMap
>(DrawerNavigator)

type DrawerExtraProps = {
  /**
   * Platform-keyed sidebar component. Replaces the default drawer content.
   * Dispatches on `Platform.OS` - `render.ios` works on iOS, `render.web`
   * on web, etc. Falls back to `setupRendering({ Drawer: { ... } })` global
   * if no prop is set, then to the built-in drawer content.
   */
  render?: DrawerRender
}

const DrawerWithRender = React.forwardRef<
  unknown,
  ComponentProps<typeof RNDrawer> & DrawerExtraProps
>((props, ref) => {
  const { render, drawerContent, ...rest } = props as any

  // Resolution: prop drawerContent > prop render[platform] > setupRendering[platform] > default
  const effectiveDrawerContent = useMemo(() => {
    if (drawerContent) return drawerContent
    const platform = Platform.OS as 'web' | 'ios' | 'android'
    const fromProp = render?.[platform]
    if (fromProp) return fromProp
    const fromGlobal = getRenderingConfig().Drawer?.[platform]
    if (fromGlobal) return fromGlobal
    return undefined
  }, [drawerContent, render])

  if (effectiveDrawerContent) {
    return <RNDrawer {...rest} ref={ref} drawerContent={effectiveDrawerContent} />
  }
  return <RNDrawer {...rest} ref={ref} />
})

// Preserve withLayoutContext's static Screen so user code like
// `<Drawer.Screen ... />` keeps working through the render wrapper.
export const Drawer = Object.assign(DrawerWithRender, {
  Screen: RNDrawer.Screen,
})

export default Drawer
