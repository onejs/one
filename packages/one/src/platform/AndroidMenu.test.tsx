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

import { ContextMenu, Menu } from './AndroidMenu'

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

it('forwards pointerEvents to the native context menu trigger', () => {
  let renderer: TestRenderer.ReactTestRenderer
  act(() => {
    renderer = TestRenderer.create(
      <ContextMenu items={[]} onAction={vi.fn()} pointerEvents="none" testID="android-context-menu">
        Trigger
      </ContextMenu>
    )
  })

  const trigger = renderer!.root.findByType('OneNativeMenuTrigger' as any)
  expect(trigger.props.pointerEvents).toBe('none')
  expect(trigger.props.contextMenuEnabled).toBe(true)
  expect(trigger.props.collapsable).toBe(false)
  act(() => renderer!.unmount())
})

it('disables contextMenuEnabled on the native trigger when disabled', () => {
  let renderer: TestRenderer.ReactTestRenderer
  act(() => {
    renderer = TestRenderer.create(
      <ContextMenu items={[]} onAction={vi.fn()} disabled pointerEvents="box-none">
        Trigger
      </ContextMenu>
    )
  })

  const trigger = renderer!.root.findByType('OneNativeMenuTrigger' as any)
  expect(trigger.props.pointerEvents).toBe('box-none')
  expect(trigger.props.contextMenuEnabled).toBe(false)
  act(() => renderer!.unmount())
})
