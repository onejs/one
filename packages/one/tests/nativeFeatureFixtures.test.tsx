import React, { useEffect } from 'react'
import { act, create } from 'react-test-renderer'
import { afterEach, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ pathname: '/', mounts: 0, unmounts: 0 }))
vi.hoisted(() => { Object.assign(globalThis, { __DEV__: true, IS_REACT_ACT_ENVIRONMENT: true }) })

vi.mock('one', () => ({
  One: { iOS: { SplitView: Object.assign(
    ({ slot: Slot, children }: { slot: React.ComponentType, children: React.ReactNode }) => <>{children}<Slot /></>,
    { Column: ({ children }: { children: React.ReactNode }) => <>{children}</> }
  ) } },
  usePathname: () => state.pathname,
  Stack: () => {
    useEffect(() => {
      state.mounts++
      return () => { state.unmounts++ }
    }, [])
    return null
  },
}))
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  LogBox: { ignoreLogs() {} },
  View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView',
  StyleSheet: { create: (value: object) => value },
}))
vi.mock('../../../tests/native-features/components/QuickNavigatePixel', () => ({
  QuickNavigatePixel: () => <input testID="quick-navigate-path-input" />,
}))
vi.mock('../../../tests/native-features/app/split-view-test', () => ({
  SplitViewFixture: () => <React.Fragment>split fixture</React.Fragment>,
}))
vi.mock('../../../tests/native-features/native-source/EscapeHatch.swift', () => ({
  EscapeHatch: {
    // swift's synthesized codable omits nil fields.
    pin: async (point: object) => ({ ...point }),
    heading: async (value: string) => value,
    at: async (value: Date) => value,
    blob: async (value: Uint8Array) => value,
  },
}))

import Layout from '../../../tests/native-features/app/_layout'
import { runNativePayloads } from '../../../tests/native-features/fixtures/one-native-payloads.ios'

afterEach(() => {
  state.pathname = '/'
  state.mounts = state.unmounts = 0
})

it('keeps the mounted navigation root when entering and leaving the split view route', async () => {
  let tree!: ReturnType<typeof create>
  await act(async () => { tree = create(<Layout />) })
  state.pathname = '/split-view-test'
  await act(async () => { tree.update(<Layout />) })
  expect(tree.root.findAllByType('View')[0].props.style.display).toBe('none')
  expect(tree.toJSON()).toContain('split fixture')
  expect(tree.root.findAllByType('input')).toHaveLength(0)
  expect(state.mounts).toBe(1)
  expect(state.unmounts).toBe(0)
  state.pathname = '/one-native-map-controls'
  await act(async () => { tree.update(<Layout />) })
  expect(tree.root.findAllByType('View')[0].props.style.display).toBe('flex')
  expect(tree.root.findAllByType('input')).toHaveLength(1)
  expect(state.mounts).toBe(1)
  expect(state.unmounts).toBe(0)
  await act(async () => { tree.unmount() })
})

it('observes Swift nil as null and a populated optional label without changing the native wire', async () => {
  expect(JSON.parse(await runNativePayloads())).toEqual({
    pinned: { x: 1, y: 2, label: null },
    labeled: { x: 3, y: 4, label: 'Named waypoint' },
    heading: 'north',
    at: '2026-01-01T00:00:00.000Z',
    blob: [1, 2, 3],
  })
})

it('keeps navigation within both collapsed split columns and observes sidebar selection', async () => {
  const { SplitViewFixture } = await vi.importActual<typeof import('../../../tests/native-features/app/split-view-test')>(
    '../../../tests/native-features/app/split-view-test'
  )
  let tree!: ReturnType<typeof create>
  await act(async () => { tree = create(<SplitViewFixture />) })
  for (const testID of ['split-sidebar', 'split-main-slot']) {
    expect(tree.root.findByProps({ testID }).findByProps({ testID: 'quick-navigate-path-input' })).toBeDefined()
  }
  await act(async () => { tree.root.findByProps({ testID: 'split-sidebar-item-drafts' }).props.onPress() })
  for (const receipt of tree.root.findAllByProps({ testID: 'split-view-selected-id' })) {
    expect(receipt.props.children).toEqual(['Selected: ', 'drafts'])
  }
  await act(async () => { tree.unmount() })
})
