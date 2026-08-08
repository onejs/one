import { beforeEach, expect, test, vi } from 'vitest'
import type { One } from '../vite/types'

const probe = vi.hoisted<{
  navigationRef: { current: null }
  routerNavigationRef: { current: null } | null
  initialize: ReturnType<typeof vi.fn>
}>(() => ({
  navigationRef: { current: null },
  routerNavigationRef: null,
  initialize: vi.fn((_context: unknown, navigationRef: { current: null }) => {
    probe.routerNavigationRef = navigationRef
  }),
}))

vi.hoisted(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} })
})

vi.mock('@react-navigation/native', () => ({
  useNavigationContainerRef: () => probe.navigationRef,
}))

vi.mock('../useLoader', () => ({ resetLoaderState: vi.fn() }))

vi.mock('./router', () => ({
  initialize: probe.initialize,
  get navigationRef() {
    return probe.routerNavigationRef
  },
  routeNode: null,
  rootComponent: null,
  initialState: undefined,
}))

vi.mock('./linkingConfig', () => ({
  ensureBaseLinkingConfig: vi.fn(),
  getSSRInitialState: vi.fn(),
}))

import { useInitializeOneRouter } from './useInitializeOneRouter'

beforeEach(() => {
  probe.initialize.mockClear()
})

test('initializes a fresh navigation root with its current location', () => {
  const context: One.RouteContext = Object.assign(
    function routeContext<T>(_id: string): T {
      throw new Error('route context is not evaluated by this probe')
    },
    {
      keys: () => [],
      resolve: (id: string) => id,
      id: 'preview-lifecycle-probe',
    }
  )
  const firstRef = { current: null }
  probe.navigationRef = firstRef
  useInitializeOneRouter(context, new URL('https://preview.test/'))

  const nextRef = { current: null }
  const nextLocation = new URL('https://preview.test/home/feed')
  probe.navigationRef = nextRef
  useInitializeOneRouter(context, nextLocation)

  expect(probe.initialize).toHaveBeenLastCalledWith(
    context,
    nextRef,
    nextLocation,
    undefined
  )
})
