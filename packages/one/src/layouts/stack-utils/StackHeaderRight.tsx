import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import type { ReactNode } from 'react'

export interface StackHeaderRightProps {
  children?: ReactNode
  asChild?: boolean
}

/**
 * Configuration component for custom right header content.
 * Use `asChild` to render custom components in the right header area.
 */
export function StackHeaderRight(_props: StackHeaderRightProps) {
  return null
}

export function appendStackHeaderRightPropsToOptions(
  options: NativeStackNavigationOptions,
  props: StackHeaderRightProps
): NativeStackNavigationOptions {
  if (!props.asChild) {
    return options
  }

  return {
    ...options,
    headerRight: () => props.children,
  }
}
