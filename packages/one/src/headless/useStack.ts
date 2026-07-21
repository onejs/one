'use client'

import type { ParamListBase } from '@react-navigation/core'
import type { StackActionHelpers, StackNavigationState } from '@react-navigation/routers'
import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type PropsWithChildren,
  type ReactElement,
} from 'react'

import type { UseStackResult } from './types'
import { getPathFromState } from '../fork/getPathFromState'
import { router } from '../router/imperative-api'
import { getResolvedLinking } from '../router/linkingConfig'

export type HeadlessStackDescriptors = Record<
  string,
  {
    options: Record<string, any>
    render: () => ReactElement
  }
>

type StackStateProviderProps = PropsWithChildren<{
  state: StackNavigationState<ParamListBase>
  descriptors: HeadlessStackDescriptors
  navigation: StackActionHelpers<ParamListBase> & { goBack: () => void }
}>

const StackContext = createContext<UseStackResult | null>(null)

export function StackStateProvider({
  state,
  descriptors,
  navigation,
  children,
}: StackStateProviderProps) {
  const linking = getResolvedLinking()
  const value = useMemo<UseStackResult>(() => {
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
      navigation: {
        back: () => navigation.goBack(),
        push: (href) => router.push(href as any),
        replace: (href) => router.replace(href as any),
      },
    }
  }, [descriptors, linking, navigation, state])

  return createElement(StackContext.Provider, { value }, children)
}

export function useStack(): UseStackResult {
  const value = useContext(StackContext)
  if (!value) {
    throw new Error(
      'useStack() must be called inside a <Stack>. it is web-only: on native the stack is rendered by react-navigation.'
    )
  }
  return value
}
