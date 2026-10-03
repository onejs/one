'use client'

import {
  createNavigatorFactory,
  useNavigationBuilder,
  type EventArg,
  type ParamListBase,
} from '@react-navigation/core'
import {
  CommonActions,
  StackActions,
  StackRouter,
  type StackActionHelpers,
  type StackNavigationState,
  type StackRouterOptions,
} from '@react-navigation/routers'
import type {
  NativeStackNavigationEventMap,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack'
import { useEffect, type ReactNode } from 'react'

import { findLastNonOverlayIndex } from './stackStateUtils'
import { WebStackView } from './WebStackView'

type WebStackNavigatorProps = {
  initialRouteName?: string
  screenOptions?: NativeStackNavigationOptions
  children: ReactNode
  headlessChildren?: ReactNode[]
  id?: string
  // accept anything else NativeStackNavigator does so withLayoutContext can pass through
  [k: string]: any
}

/**
 * Drop-in replacement for NativeStackNavigator on web.
 *
 * Uses the same router (StackRouter) and option shape as native-stack so
 * navigation behavior is identical; the view renders the focused screen and
 * delegates presentation chrome to Presentations.
 */
function WebStackNavigator({
  initialRouteName,
  children,
  screenOptions,
  headlessChildren,
  ...rest
}: WebStackNavigatorProps) {
  const { state, navigation, descriptors, NavigationContent } = useNavigationBuilder<
    StackNavigationState<ParamListBase>,
    StackRouterOptions,
    StackActionHelpers<ParamListBase>,
    NativeStackNavigationOptions,
    NativeStackNavigationEventMap
  >(StackRouter, {
    ...(rest as any),
    children,
    screenOptions,
    initialRouteName,
  })

  // a deep link to a sheet or modal route lands on a stack holding only that
  // overlay: the linking state carries no base route, and StackRouter seats
  // initialRouteName only into an empty stack. seat it beneath the overlay so
  // the presenting screen renders under it and dismissing pops back to it,
  // as a native deep link into a formSheet does.
  useEffect(() => {
    if (!initialRouteName) return
    if (!state.routeNames.includes(initialRouteName)) return
    if (findLastNonOverlayIndex(state, descriptors) !== -1) return
    // the navigator persists its initial state to its parent in an effect of
    // its own; a reset dispatched in the same pass is overwritten by it, and
    // the state can be re-keyed by then, so the reset reads the live state
    const timer = setTimeout(() => {
      const current = navigation.getState()
      if (findLastNonOverlayIndex(current, descriptors) !== -1) return
      navigation.dispatch({
        ...CommonActions.reset({
          stale: true,
          routes: [
            { name: initialRouteName, params: undefined },
            ...current.routes.map(({ key, name, params, path }) => ({ key, name, params, path })),
          ],
          index: current.routes.length,
        }),
        target: current.key,
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [initialRouteName, state, descriptors, navigation])

  // Mirror native-stack tabPress popToTop behavior
  useEffect(() => {
    // @ts-expect-error: tabPress may not exist on this navigation
    return navigation?.addListener?.('tabPress', (e: EventArg<'tabPress', true>) => {
      const isFocused = navigation.isFocused()
      requestAnimationFrame(() => {
        if (state.index > 0 && isFocused && !e.defaultPrevented) {
          navigation.dispatch({
            ...StackActions.popToTop(),
            target: state.key,
          })
        }
      })
    })
  }, [navigation, state.index, state.key])

  return (
    <NavigationContent>
      <WebStackView
        state={state}
        navigation={navigation as any}
        descriptors={descriptors as any}
        customChildren={headlessChildren}
      />
    </NavigationContent>
  )
}

export const createWebStackNavigator = createNavigatorFactory(WebStackNavigator)
