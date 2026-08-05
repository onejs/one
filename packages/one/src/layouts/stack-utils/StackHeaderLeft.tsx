import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import type { ReactNode } from 'react'

import { NAVIGATOR_CONFIG } from '../../headless/children'

export interface StackHeaderLeftProps {
  children?: ReactNode
  asChild?: boolean
}

/**
 * Configuration component for custom left header content.
 * Use `asChild` to render custom components in the left header area.
 */
export function StackHeaderLeft(_props: StackHeaderLeftProps) {
  return null
}

Object.assign(StackHeaderLeft, { [NAVIGATOR_CONFIG]: true })

export function appendStackHeaderLeftPropsToOptions(
  options: NativeStackNavigationOptions,
  props: StackHeaderLeftProps
): NativeStackNavigationOptions {
  if (!props.asChild) {
    return options
  }

  return {
    ...options,
    headerLeft: () => props.children,
  }
}
