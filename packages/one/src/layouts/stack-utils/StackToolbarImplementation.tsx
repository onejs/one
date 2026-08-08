'use client'

import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { createContext, useContext, type PropsWithChildren, type ReactNode } from 'react'

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

const StackToolbarImplementationContext =
  createContext<StackToolbarImplementation | null>(null)

export function StackToolbarImplementationProvider({
  children,
  implementation,
}: PropsWithChildren<{ implementation: StackToolbarImplementation }>) {
  return (
    <StackToolbarImplementationContext.Provider value={implementation}>
      {children}
    </StackToolbarImplementationContext.Provider>
  )
}

export function useStackToolbarImplementation() {
  return useContext(StackToolbarImplementationContext)
}
