import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  findNodeHandle: vi.fn(),
  Pressable: 'Pressable',
  TurboModuleRegistry: { get: vi.fn() },
  View: 'View',
}))

vi.mock('./menuItems', () => ({ flattenMenuItems: () => [] }))

import { Menu } from './AndroidMenu'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

it('keeps the iOS primaryAction callback off the Android trigger View', () => {
  const primaryAction = vi.fn()
  let renderer: TestRenderer.ReactTestRenderer
  act(() => {
    renderer = TestRenderer.create(
      <Menu items={[]} onAction={vi.fn()} primaryAction={primaryAction} testID="android-menu">
        Trigger
      </Menu>
    )
  })

  const trigger = renderer!.root.findByType('View')
  expect(trigger.props.testID).toBe('android-menu')
  expect(trigger.props).not.toHaveProperty('primaryAction')
  act(() => renderer!.unmount())
})
