'use client'

import {
  DrawerActions,
  type DrawerActionHelpers,
  type DrawerNavigationState,
  type ParamListBase,
} from '@react-navigation/routers'
import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
  type ReactElement,
} from 'react'

import { getPathFromState } from '../fork/getPathFromState'
import { getResolvedLinking } from '../router/linkingConfig'
import type { UseDrawerResult } from './types'

export type HeadlessDrawerDescriptors = Record<
  string,
  {
    options: Record<string, any>
    render: () => ReactElement
  }
>

type HeadlessDrawerNavigation = DrawerActionHelpers<ParamListBase> & {
  dispatch: (action: any) => void
}

type DrawerStateProviderProps = PropsWithChildren<{
  state: DrawerNavigationState<ParamListBase>
  descriptors: HeadlessDrawerDescriptors
  navigation: HeadlessDrawerNavigation
}>

const DrawerContext = createContext<UseDrawerResult | null>(null)

export function DrawerStateProvider({
  state,
  descriptors,
  navigation,
  children,
}: DrawerStateProviderProps) {
  const linking = getResolvedLinking()
  const value = useMemo<UseDrawerResult>(() => {
    const screens = state.routes.map((route, index) => {
      const descriptor = descriptors[route.key]!
      const options = descriptor.options
      const href = (linking?.getPathFromState ?? getPathFromState)(
        { ...state, index },
        linking?.config
      )

      return {
        key: route.key,
        name: route.name,
        params: (route.params ?? {}) as Record<string, any>,
        href,
        isFocused: index === state.index,
        keepMounted: options.keepMounted === true,
        options,
        element: descriptor.render(),
      }
    })

    return {
      screens,
      focused: screens[state.index]!,
      isOpen: state.history.some((entry) => entry.type === 'drawer'),
      open: () => navigation.dispatch(DrawerActions.openDrawer()),
      close: () => navigation.dispatch(DrawerActions.closeDrawer()),
      toggle: () => navigation.dispatch(DrawerActions.toggleDrawer()),
    }
  }, [descriptors, linking, navigation, state])

  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
}

export function useDrawer(): UseDrawerResult {
  const value = useContext(DrawerContext)
  if (!value) {
    throw new Error('useDrawer must be used inside a Drawer navigator')
  }
  return value
}
