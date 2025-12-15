'use client'

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { Children, isValidElement, useMemo, type PropsWithChildren } from 'react'

import {
  StackHeaderComponent,
  appendStackHeaderPropsToOptions,
  type StackHeaderProps,
} from './StackHeaderComponent'
import { Screen } from '../../views/Screen'

export interface StackScreenProps extends PropsWithChildren {
  name?: string
  options?: NativeStackNavigationOptions
}

/**
 * Stack screen component with support for compositional header configuration.
 *
 * @example
 * ```tsx
 * <Stack.Screen name="home" options={{ title: 'Home' }}>
 *   <Stack.Header>
 *     <Stack.Header.Title large>Welcome</Stack.Header.Title>
 *   </Stack.Header>
 * </Stack.Screen>
 * ```
 */
export function StackScreen({ children, options, ...rest }: StackScreenProps) {
  const updatedOptions = useMemo(
    () =>
      appendScreenStackPropsToOptions(options ?? {}, {
        children,
      }),
    [options, children]
  )
  return <Screen {...rest} options={updatedOptions} />
}

export function appendScreenStackPropsToOptions(
  options: NativeStackNavigationOptions,
  props: StackScreenProps
): NativeStackNavigationOptions {
  let updatedOptions = { ...options, ...props.options }

  function appendChildOptions(child: React.ReactElement, options: NativeStackNavigationOptions) {
    if (child.type === StackHeaderComponent) {
      return appendStackHeaderPropsToOptions(options, child.props as StackHeaderProps)
    } else {
      console.warn(
        `Warning: Unknown child element passed to Stack.Screen: ${(child.type as { name: string }).name ?? child.type}`
      )
    }
    return options
  }

  Children.forEach(props.children, (child) => {
    if (isValidElement(child)) {
      updatedOptions = appendChildOptions(child, updatedOptions)
    }
  })

  return updatedOptions
}
