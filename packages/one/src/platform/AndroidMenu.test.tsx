import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { View } from 'react-native'
import { expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  findNodeHandle: vi.fn(),
  Pressable: 'Pressable',
  requireNativeComponent: vi.fn((name: string) => name),
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
      <Menu items={[]} onAction={vi.fn()} primaryAction={primaryAction} accessibilityLabel="Android menu" testID="android-menu">
        Trigger
      </Menu>
    )
  })

  const trigger = renderer!.root.findByType(View)
  expect(trigger.props.testID).toBe('android-menu')
  expect(trigger.props.accessibilityLabel).toBe('Android menu')
  expect(trigger.props).not.toHaveProperty('primaryAction')
  act(() => renderer!.unmount())
})
