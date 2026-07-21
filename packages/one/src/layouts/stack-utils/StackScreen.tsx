'use client'

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { Children, isValidElement, useMemo, type PropsWithChildren } from 'react'

import { NAVIGATOR_CONFIG } from '../../headless/children'
import {
  StackHeaderComponent,
  appendStackHeaderPropsToOptions,
  type StackHeaderProps,
} from './StackHeaderComponent'
import {
  StackToolbar,
  appendStackToolbarPropsToOptions,
  type StackToolbarProps,
} from './StackToolbar'
import { Screen } from '../../views/Screen'

export type StackScreenOptions = Omit<NativeStackNavigationOptions, 'presentation'> & {
  presentation?: NativeStackNavigationOptions['presentation'] | 'sheet' | (string & {})

  /**
   * Web-only. When `true`, the route's React subtree stays mounted across
   * dismissal and re-navigation - `useState`, `useId`, `useReducer`, refs,
   * and anything stored in the route component all survive.
   *
   * Caveat: route params are captured at first mount. If the same route is
   * navigated to with different params later, the captured subtree keeps
   * the original params. Best for stable, parameter-free overlays
   * (settings, persistent filters, command palettes). For routes with
   * dynamic params, leave `keepMounted` off.
   */
  keepMounted?: boolean
}

export interface StackScreenProps extends PropsWithChildren {
  name?: string
  options?: StackScreenOptions
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
  return <Screen {...rest} options={updatedOptions as NativeStackNavigationOptions} />
}

Object.assign(StackScreen, { [NAVIGATOR_CONFIG]: true })

const NATIVE_PRESENTATIONS = [
  'card',
  'modal',
  'transparentModal',
  'containedModal',
  'containedTransparentModal',
  'fullScreenModal',
  'formSheet',
  'pageSheet',
] as const

// maps semantic and custom presentations to native-stack values on native
export function validateStackPresentation(options: StackScreenOptions): StackScreenOptions
export function validateStackPresentation<
  F extends (...args: never[]) => StackScreenOptions,
>(options: F): F
export function validateStackPresentation(
  options: StackScreenOptions | ((...args: never[]) => StackScreenOptions)
): ((...args: never[]) => StackScreenOptions) | StackScreenOptions {
  if (typeof options === 'function') {
    return (...args: never[]) => {
      return validateStackPresentation(options(...args))
    }
  }

  if (process.env.TAMAGUI_TARGET === 'web' || !options.presentation) {
    return options
  }

  if (options.presentation === 'sheet') {
    return { ...options, presentation: 'formSheet' }
  }

  return NATIVE_PRESENTATIONS.includes(
    options.presentation as (typeof NATIVE_PRESENTATIONS)[number]
  )
    ? options
    : { ...options, presentation: 'modal' }
}

export function appendScreenStackPropsToOptions(
  options: StackScreenOptions,
  props: StackScreenProps
): StackScreenOptions {
  let updatedOptions: StackScreenOptions = { ...options, ...props.options }

  updatedOptions = validateStackPresentation(updatedOptions)

  function appendChildOptions(child: React.ReactElement, options: StackScreenOptions) {
    if (child.type === StackHeaderComponent) {
      // widened presentation strings are erased before native-stack consumes options
      return appendStackHeaderPropsToOptions(
        options as NativeStackNavigationOptions,
        child.props as StackHeaderProps
      ) as StackScreenOptions
    } else if (child.type === StackToolbar) {
      return appendStackToolbarPropsToOptions(
        options as NativeStackNavigationOptions,
        child.props as StackToolbarProps
      ) as StackScreenOptions
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
