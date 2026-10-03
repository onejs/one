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

it('keeps onPickerChange off the Android trigger View without picker items', () => {
  const onPickerChange = vi.fn()
  let renderer: TestRenderer.ReactTestRenderer
  act(() => {
    renderer = TestRenderer.create(
      <Menu items={[]} onAction={vi.fn()} onPickerChange={onPickerChange} accessibilityLabel="Android menu" testID="android-menu">
        Trigger
      </Menu>
    )
  })

  const trigger = renderer!.root.findByType(View)
  expect(trigger.props.testID).toBe('android-menu')
  expect(trigger.props).not.toHaveProperty('onPickerChange')
  act(() => renderer!.unmount())
})

it('rejects picker items before opening the Android popup', () => {
  expect(() =>
    act(() => {
      TestRenderer.create(
        <Menu
          items={[{
            type: 'picker', id: 'size', title: 'Size', selection: 'small',
            children: [{ type: 'action', id: 'small', title: 'Small' }],
          }]}
          onAction={vi.fn()}
          onPickerChange={vi.fn()}
          accessibilityLabel="Android menu"
        >
          Trigger
        </Menu>
      )
    })
  ).toThrow('Menu picker items are not supported on Android')
})
