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
 *     <Stack.Header.SearchBar placeholder="Search..." />
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

const VALID_PRESENTATIONS = [
  'card',
  'modal',
  'transparentModal',
  'containedModal',
  'containedTransparentModal',
  'fullScreenModal',
  'formSheet',
  'pageSheet',
] as const

// validates presentation value in dev to prevent native crashes from invalid values
export function validateStackPresentation(
  options: NativeStackNavigationOptions
): NativeStackNavigationOptions
export function validateStackPresentation<
  F extends (...args: never[]) => NativeStackNavigationOptions,
>(options: F): F
export function validateStackPresentation(
  options: NativeStackNavigationOptions | ((...args: never[]) => NativeStackNavigationOptions)
): ((...args: never[]) => NativeStackNavigationOptions) | NativeStackNavigationOptions {
  if (typeof options === 'function') {
    return (...args: never[]) => {
      const resolved = options(...args)
      validateStackPresentation(resolved)
      return resolved
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const presentation = options.presentation
    if (
      presentation &&
      !VALID_PRESENTATIONS.includes(presentation as (typeof VALID_PRESENTATIONS)[number])
    ) {
      console.warn(
        `Invalid presentation value "${presentation}" passed to Stack.Screen. Valid values are: ${VALID_PRESENTATIONS.map((v) => `"${v}"`).join(', ')}.`
      )
    }
  }
  return options
}

export function appendScreenStackPropsToOptions(
  options: NativeStackNavigationOptions,
  props: StackScreenProps
): NativeStackNavigationOptions {
  let updatedOptions = { ...options, ...props.options }

  validateStackPresentation(updatedOptions)

  function appendChildOptions(
    child: React.ReactElement,
    options: NativeStackNavigationOptions
  ) {
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
