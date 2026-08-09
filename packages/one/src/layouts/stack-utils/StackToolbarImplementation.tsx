'use client'

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import type { ReactNode } from 'react'

import type { StackToolbarProps } from './StackToolbar.types'

export const STACK_TOOLBAR_CHILD = Symbol.for('one.stack-toolbar.child')

export type StackToolbarChildType =
  | 'button'
  | 'menu'
  | 'menuAction'
  | 'spacer'
  | 'searchBarSlot'
  | 'view'
  | 'label'
  | 'icon'
  | 'badge'

export type StackToolbarImplementation = {
  appendPropsToOptions: (
    options: NativeStackNavigationOptions,
    props: StackToolbarProps
  ) => NativeStackNavigationOptions
  render: (props: StackToolbarProps) => ReactNode
}

let stackToolbarImplementation: StackToolbarImplementation | null = null

export function registerStackToolbarImplementation(
  implementation: StackToolbarImplementation
) {
  stackToolbarImplementation = implementation
}

export function getStackToolbarImplementation() {
  return stackToolbarImplementation
}
