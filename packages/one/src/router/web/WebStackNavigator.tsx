'use client'

import {
  createNavigatorFactory,
  useNavigationBuilder,
  type EventArg,
  type ParamListBase,
} from '@react-navigation/core'
import {
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
 * delegates presentation chrome to NavigationRender.
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
