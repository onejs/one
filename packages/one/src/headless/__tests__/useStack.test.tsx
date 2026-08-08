import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { describe, expect, it } from 'vitest'

import { appendStackToolbarConfig } from '../../layouts/stack-utils/StackToolbar.shared'
import { StackStateProvider, useStack, type HeadlessStackDescriptors } from '../useStack'

describe('StackStateProvider', () => {
  it('hands toolbar config to headless implementations', () => {
    let options: Record<string, any> | undefined

    function Capture() {
      options = useStack().focused.options
      return null
    }

    const state = {
      stale: false as const,
      type: 'stack' as const,
      key: 'stack-key',
      index: 0,
      routeNames: ['index'],
      routes: [{ key: 'index-key', name: 'index' }],
      preloadedRoutes: [],
    }
    const descriptors: HeadlessStackDescriptors = {
      'index-key': {
        options: appendStackToolbarConfig(
          { title: 'Inbox' },
          { placement: 'right', children: 'Share' }
        ),
        render: () => <div>Inbox</div>,
      },
    }

    act(() => {
      TestRenderer.create(
        <StackStateProvider state={state} descriptors={descriptors}>
          <Capture />
        </StackStateProvider>
      )
    })

    expect(options).toMatchObject({
      title: 'Inbox',
      toolbar: {
        right: {
          placement: 'right',
          children: 'Share',
        },
      },
    })
  })
})
