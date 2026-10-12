import Module from 'node:module'
import React from 'react'
import { act, create } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  screens: [] as React.ReactNode[],
  platform: { OS: 'ios' },
}))
vi.hoisted(() => {
  Object.assign(globalThis, { __DEV__: true, IS_REACT_ACT_ENVIRONMENT: true })
})
vi.mock('react-native', () => ({ Platform: state.platform, View: 'View' }))
vi.mock('../../router/Route', () => ({
  useContextKey: () => '/_layout',
  useRouteNode: () => undefined,
}))
vi.mock('../../router/router', () => ({
  registerProtectedRoutes: vi.fn(),
  unregisterProtectedRoutes: vi.fn(),
  replace: vi.fn(),
  resolveProtectedHref: vi.fn(),
  routeInfo: {},
}))
vi.mock('../../router/useScreens', () => ({ useSortedScreens: () => state.screens }))
vi.mock('../../views/Screen', () => ({ Screen: () => null }))
vi.mock('../../layouts/stack-utils/StackScreen', () => ({ StackScreen: () => null }))

import { withLayoutContext } from '../../layouts/withLayoutContext'
import { SplitView } from './split-view.native'

const children = () => (
  <SplitView.Column>
    <React.Fragment>sidebar</React.Fragment>
  </SplitView.Column>
)
const loader = Module as unknown as { _load: (id: string, ...args: unknown[]) => unknown }
const originalLoad = loader._load
const roots: ReturnType<typeof create>[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await act(async () => root.unmount())
  state.screens = []
  state.platform.OS = 'ios'
  vi.restoreAllMocks()
})
function nativeHost() {
  return vi
    .spyOn(loader, '_load')
    .mockImplementation((id: string, ...args: unknown[]) =>
      id === 'react-native-screens/experimental'
        ? { Split: { Host: 'div', Column: 'section', Inspector: 'aside' } }
        : originalLoad.call(loader, id, ...args)
    )
}
async function mount(element: React.ReactElement) {
  let root!: ReturnType<typeof create>
  await act(async () => {
    root = create(element)
  })
  roots.push(root)
  return root
}

describe('SplitView native placement', () => {
  it('rejects a split in a layout navigator before mounting its native host', async () => {
    const load = nativeHost()
    const Navigator = withLayoutContext(
      ({ children }: { children?: React.ReactNode }) => <>{children}</>
    )
    state.screens = [<SplitView key="split">{children()}</SplitView>]
    await expect(mount(<Navigator />)).rejects.toThrow(
      'SplitView cannot be used inside another navigator'
    )
    expect(
      load.mock.calls.filter(([id]) => id === 'react-native-screens/experimental')
    ).toHaveLength(0)
  })

  it('mounts a split at the root with sidebar and routed detail', async () => {
    nativeHost()
    const Detail = () => <>detail</>
    const root = await mount(<SplitView slot={Detail}>{children()}</SplitView>)
    expect(root.root.findAllByType('div')).toHaveLength(1)
    expect(root.root.findAllByType('section')).toHaveLength(2)
    expect(root.root.findByType(Detail)).toBeDefined()
  })

  it('retains the non-iOS slot behavior inside a layout navigator', async () => {
    state.platform.OS = 'android'
    const Navigator = withLayoutContext(
      ({ children }: { children?: React.ReactNode }) => <>{children}</>
    )
    state.screens = [
      <SplitView key="split" slot={() => <>detail</>}>
        {children()}
      </SplitView>,
    ]
    const root = await mount(<Navigator />)
    expect(root.toJSON()).toBe('detail')
  })

  it('rejects a second split inside the first split', async () => {
    nativeHost()
    await expect(
      mount(
        <SplitView>
          <SplitView.Column>
            <SplitView>{children()}</SplitView>
          </SplitView.Column>
        </SplitView>
      )
    ).rejects.toThrow('There can only be one SplitView')
  })
})
