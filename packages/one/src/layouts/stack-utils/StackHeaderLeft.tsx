import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import type { ReactNode } from 'react'

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
