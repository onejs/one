import React from 'react'
import { STACK_TOOLBAR_CHILD } from 'one/stack-toolbar-implementation'
import { Platform } from 'react-native'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ setOptions() {} }),
}))

import { stackToolbarImplementation } from '../src/StackToolbarProvider'
import { StackToolbar as NativeStackToolbar } from '../src/stack-toolbar/StackToolbar'

const ToolbarButton = Object.assign((_props: Record<string, any>) => null, {
  [STACK_TOOLBAR_CHILD]: 'button',
})
const ToolbarLabel = Object.assign((_props: Record<string, any>) => null, {
  [STACK_TOOLBAR_CHILD]: 'label',
})

describe('StackToolbarProvider', () => {
  const withIOS = <T,>(run: () => T): T => {
    const originalOS = Platform.OS
    ;(Platform as { OS: string }).OS = 'ios'
    try {
      return run()
    } finally {
      ;(Platform as { OS: string }).OS = originalOS
    }
  }

  it('hands Stack.Toolbar header declarations to the native implementation', () =>
    withIOS(() => {
      const result = stackToolbarImplementation.appendPropsToOptions(
        { title: 'Inbox' },
        {
          placement: 'right',
          children: (
            <ToolbarButton icon="bell">
              <ToolbarLabel>Notifications</ToolbarLabel>
            </ToolbarButton>
          ),
        }
      )

      expect(result.unstable_headerRightItems?.({} as never)).toMatchObject([
        {
          type: 'button',
          label: 'Notifications',
          icon: { type: 'sfSymbol', name: 'bell' },
        },
      ])
    }))

  it('hands bottom declarations to the native toolbar renderer', () => {
    const rendered = stackToolbarImplementation.render({
      children: <ToolbarButton icon="plus">Add</ToolbarButton>,
    }) as React.ReactElement

    expect(rendered.type).toBe(NativeStackToolbar)
    expect(
      (React.Children.toArray(rendered.props.children)[0] as React.ReactElement).type
    ).toBe(NativeStackToolbar.Button)
  })
})
