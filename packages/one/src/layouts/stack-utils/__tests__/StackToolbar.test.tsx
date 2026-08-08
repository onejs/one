import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { StackToolbarImplementation } from '../StackToolbarImplementation'

import { StackToolbar } from '../StackToolbar'
import { STACK_TOOLBAR_CHILD } from '../StackToolbarImplementation'
import { exposeStackToolbarConfig } from '../StackToolbar.shared'
import { appendScreenStackPropsToOptions } from '../StackScreen'

describe('Stack.Toolbar headless config', () => {
  it('marks declaration children for installed implementations', () => {
    expect(
      (StackToolbar.Button as unknown as Record<symbol, string>)[STACK_TOOLBAR_CHILD]
    ).toBe('button')
    expect(
      (StackToolbar.MenuAction as unknown as Record<symbol, string>)[STACK_TOOLBAR_CHILD]
    ).toBe('menuAction')
  })

  it('preserves every placement for the headless stack implementation', () => {
    const options = appendScreenStackPropsToOptions(
      { title: 'Inbox' },
      {
        children: [
          <StackToolbar key="left" placement="left">
            <StackToolbar.Button icon="sidebar.left" />
          </StackToolbar>,
          <StackToolbar key="right" placement="right">
            <StackToolbar.Button icon="square.and.arrow.up" />
          </StackToolbar>,
        ],
      }
    )

    expect(exposeStackToolbarConfig(options)).toMatchObject({
      title: 'Inbox',
      toolbar: {
        left: { placement: 'left' },
        right: { placement: 'right' },
      },
    })
  })

  it('hands toolbar declarations to an installed implementation', () => {
    const appendPropsToOptions = vi.fn((options) => ({
      ...options,
      headerShown: true,
    }))
    const implementation: StackToolbarImplementation = {
      appendPropsToOptions,
      render: () => null,
    }
    const toolbar = (
      <StackToolbar placement="right">
        <StackToolbar.Button icon="square.and.arrow.up">Share</StackToolbar.Button>
      </StackToolbar>
    )

    const options = appendScreenStackPropsToOptions(
      { title: 'Inbox' },
      { children: toolbar },
      implementation
    )

    expect(options.headerShown).toBe(true)
    expect(appendPropsToOptions).toHaveBeenCalledOnce()
    expect(appendPropsToOptions.mock.calls[0]?.[1]).toBe(toolbar.props)
    expect(exposeStackToolbarConfig(options).toolbar.right).toBe(toolbar.props)
  })
})
