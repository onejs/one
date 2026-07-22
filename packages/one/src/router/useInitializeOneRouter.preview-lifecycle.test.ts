import { beforeEach, expect, test, vi } from 'vitest'

const probe = vi.hoisted(() => ({
  navigationRef: { current: null } as { current: unknown },
  routerNavigationRef: null as { current: unknown } | null,
  initialize: vi.fn((_context, navigationRef) => {
    probe.routerNavigationRef = navigationRef
  }),
}))

vi.hoisted(() => {
  globalThis.window = {} as Window & typeof globalThis
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
  const context = {}
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
