'use client'

import {
  Children,
  createElement,
  isValidElement,
  type ComponentType,
  type PropsWithChildren,
  type ReactNode,
} from 'react'
import {
  STACK_TOOLBAR_CHILD,
  StackToolbarImplementationProvider,
  type StackToolbarChildType,
  type StackToolbarImplementation,
  type StackToolbarProps,
} from 'one/stack-toolbar-implementation'

import {
  StackToolbar as NativeStackToolbar,
  appendStackToolbarPropsToOptions,
} from './stack-toolbar/StackToolbar'

function mapToolbarChildren(children: ReactNode): ReactNode {
  if (typeof children === 'string' || typeof children === 'number') return children

  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child

    const childType = (child.type as unknown as Record<symbol, StackToolbarChildType>)[
      STACK_TOOLBAR_CHILD
    ]
    let NativeComponent: ComponentType<any> | undefined
    switch (childType) {
      case 'button':
        NativeComponent = NativeStackToolbar.Button
        break
      case 'menu':
        NativeComponent = NativeStackToolbar.Menu
        break
      case 'menuAction':
        NativeComponent = NativeStackToolbar.MenuAction
        break
      case 'spacer':
        NativeComponent = NativeStackToolbar.Spacer
        break
      case 'searchBarSlot':
        NativeComponent = NativeStackToolbar.SearchBarSlot
        break
      case 'view':
        NativeComponent = NativeStackToolbar.View
        break
      case 'label':
        NativeComponent = NativeStackToolbar.Label
        break
      case 'icon':
        NativeComponent = NativeStackToolbar.Icon
        break
      case 'badge':
        NativeComponent = NativeStackToolbar.Badge
        break
    }

    if (!NativeComponent) return child

    const props = child.props as Record<string, any>
    return createElement(
      NativeComponent,
      { ...props, key: child.key },
      mapToolbarChildren(props.children)
    )
  })
}

export const stackToolbarImplementation: StackToolbarImplementation = {
  appendPropsToOptions(options, props) {
    if ((props.placement ?? 'bottom') === 'bottom') return options

    return appendStackToolbarPropsToOptions(options, {
      ...props,
      children: mapToolbarChildren(props.children),
    })
  },
  render(props: StackToolbarProps) {
    if ((props.placement ?? 'bottom') !== 'bottom') return null

    return (
      <NativeStackToolbar {...props}>
        {mapToolbarChildren(props.children)}
      </NativeStackToolbar>
    )
  },
}

export function StackToolbarProvider({ children }: PropsWithChildren) {
  return (
    <StackToolbarImplementationProvider implementation={stackToolbarImplementation}>
      {children}
    </StackToolbarImplementationProvider>
  )
}
