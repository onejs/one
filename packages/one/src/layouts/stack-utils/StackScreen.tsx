'use client'

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { Children, isValidElement, useMemo, type PropsWithChildren } from 'react'

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
import type { StackRender } from '../../router/web/ScreenRenderContext'

export type StackScreenOptions = NativeStackNavigationOptions & {
  /**
   * Per-route override of the Stack-level `render` prop. Same platform-keyed
   * shape (`{ web?, ios?, android? }`); v1 consumes `web` only. When set, it
   * takes precedence over the Stack-level render for this route.
   */
  render?: StackRender

  /**
   * Web-only. When `true`, the route's React subtree stays mounted across
   * dismissal and re-navigation - `useState`, `useId`, `useReducer`, refs,
   * and anything stored in the route component all survive. The render
   * component receives `open: false` while the route is "closed".
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
  options:
    | NativeStackNavigationOptions
    | ((...args: never[]) => NativeStackNavigationOptions)
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
  options: StackScreenOptions,
  props: StackScreenProps
): StackScreenOptions {
  let updatedOptions: StackScreenOptions = { ...options, ...props.options }

  validateStackPresentation(updatedOptions)

  function appendChildOptions(child: React.ReactElement, options: StackScreenOptions) {
    if (child.type === StackHeaderComponent) {
      return appendStackHeaderPropsToOptions(options, child.props as StackHeaderProps)
    } else if (child.type === StackToolbar) {
      return appendStackToolbarPropsToOptions(options, child.props as StackToolbarProps)
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
