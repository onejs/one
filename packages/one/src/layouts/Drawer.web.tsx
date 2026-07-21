'use client'

import { createNavigatorFactory, useNavigationBuilder } from '@react-navigation/core'
import type {
  DrawerNavigationEventMap,
  DrawerNavigationOptions,
} from '@react-navigation/drawer'
import {
  type DrawerActionHelpers,
  type DrawerNavigationState,
  DrawerRouter,
  type DrawerRouterOptions,
  type ParamListBase,
} from '@react-navigation/routers'
import { Children, type ComponentProps, forwardRef, type ReactNode } from 'react'

import { getCustomNavigatorChildren, isNavigatorConfigChild } from '../headless/children'
import { devHeadlessNote } from '../headless/devHeadlessNote'
import {
  DrawerStateProvider,
  type HeadlessDrawerDescriptors,
  useDrawer,
} from '../headless/useDrawer'
import { withLayoutContext } from './withLayoutContext'

type WebDrawerNavigatorProps = {
  children: ReactNode
  headlessChildren?: ReactNode[]
  initialRouteName?: string
  defaultStatus?: DrawerRouterOptions['defaultStatus']
  backBehavior?: DrawerRouterOptions['backBehavior']
  screenOptions?: DrawerNavigationOptions | ((props: any) => DrawerNavigationOptions)
  [key: string]: any
}

function WebDrawerNavigator({
  children,
  headlessChildren,
  initialRouteName,
  defaultStatus,
  backBehavior,
  screenOptions,
  ...rest
}: WebDrawerNavigatorProps) {
  const { state, descriptors, navigation, NavigationContent } = useNavigationBuilder<
    DrawerNavigationState<ParamListBase>,
    DrawerRouterOptions,
    DrawerActionHelpers<ParamListBase>,
    DrawerNavigationOptions,
    DrawerNavigationEventMap
  >(DrawerRouter, {
    ...(rest as any),
    children,
    initialRouteName,
    defaultStatus,
    backBehavior,
    screenOptions,
  })

  return (
    <NavigationContent>
      <DrawerStateProvider
        state={state}
        descriptors={descriptors as HeadlessDrawerDescriptors}
        navigation={navigation}
      >
        <HeadlessDrawerView customChildren={headlessChildren} />
      </DrawerStateProvider>
    </NavigationContent>
  )
}

function HeadlessDrawerView({ customChildren }: { customChildren?: ReactNode[] }) {
  const drawer = useDrawer()

  devHeadlessNote('Drawer')

  if (customChildren?.length) {
    return <>{customChildren}</>
  }

  return drawer.focused.element
}

const DrawerNavigator = createNavigatorFactory(WebDrawerNavigator)().Navigator

const RNDrawer = withLayoutContext<
  DrawerNavigationOptions,
  typeof DrawerNavigator,
  DrawerNavigationState<ParamListBase>,
  DrawerNavigationEventMap
>(DrawerNavigator)

const DrawerWithHeadless = forwardRef<unknown, ComponentProps<typeof RNDrawer>>(
  (props, ref) => {
    const { children, ...rest } = props
    const customChildren = getCustomNavigatorChildren(children)

    return (
      <RNDrawer
        {...rest}
        ref={ref}
        headlessChildren={customChildren.length ? customChildren : undefined}
      >
        {Children.toArray(children).filter(isNavigatorConfigChild)}
      </RNDrawer>
    )
  }
)

export const Drawer = Object.assign(DrawerWithHeadless, {
  Screen: RNDrawer.Screen,
})

export default Drawer
