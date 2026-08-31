import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const subscriptions = vi.hoisted(() => ({
  loading: undefined as ((state: 'loading' | 'loaded') => void) | undefined,
  root: undefined as ((state: any) => void) | undefined,
}))

// the router's committed route. updateState writes this and then notifies root
// state subscribers, so it is current inside the subscriber while
// window.location still points at the route being left — react-navigation's
// linking listener writes the URL after. every test below drives the two in
// that order.
const router = vi.hoisted(() => ({
  routeInfo: { unstable_globalHref: '/', pathname: '/' } as
    | { unstable_globalHref: string; pathname: string }
    | undefined,
}))

vi.mock('../router/lastAction', () => ({
  setLastAction: vi.fn(),
}))

vi.mock('../router/router', () => ({
  get routeInfo() {
    return router.routeInfo
  },
  subscribeToLoadingState: (subscriber: typeof subscriptions.loading) => {
    subscriptions.loading = subscriber
    return () => {
      subscriptions.loading = undefined
    }
  },
  subscribeToRootState: (subscriber: typeof subscriptions.root) => {
    subscriptions.root = subscriber
    return () => {
      subscriptions.root = undefined
    }
  },
}))

import { registerScrollGroup, ScrollBehavior } from './ScrollBehavior'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

type MockLocation = {
  pathname: string
  search: string
  hash: string
}

let renderer: TestRenderer.ReactTestRenderer | undefined
let location: MockLocation
let scrollTo: ReturnType<typeof vi.fn>

// one navigation, in the order the router performs it: commit the route, notify
// subscribers, then let the linking listener catch the URL up.
function navigate(pathname: string, search = '') {
  router.routeInfo = { unstable_globalHref: `${pathname}${search}`, pathname }
  act(() => subscriptions.root?.({}))
  location.pathname = pathname
  location.search = search
}

beforeEach(() => {
  process.env.VITE_ENVIRONMENT = 'client'
  location = { pathname: '/', search: '', hash: '' }
  router.routeInfo = { unstable_globalHref: '/', pathname: '/' }
  scrollTo = vi.fn()

  const windowMock = Object.assign(new EventTarget(), {
    location,
    scrollTo,
    scrollY: 500,
  })
  const storage = new Map<string, string>()

  vi.stubGlobal('window', windowMock)
  vi.stubGlobal('document', { getElementById: vi.fn() })
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  })

  act(() => {
    renderer = TestRenderer.create(<ScrollBehavior />)
  })
})

afterEach(() => {
  act(() => renderer?.unmount())
  renderer = undefined
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete process.env.VITE_ENVIRONMENT
})

describe('ScrollBehavior initial navigation', () => {
  it('does not scroll when the navigator publishes its initial state after mount', () => {
    act(() => subscriptions.root?.({}))

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('scrolls to the top when the first state notification is a real navigation', () => {
    navigate('/compat/react-native-gesture-handler')

    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('handles a query change as a first navigation', () => {
    navigate('/', '?platform=ios')

    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })
})

describe('ScrollBehavior groups', () => {
  it('preserves position between routes in the same group', () => {
    vi.useFakeTimers()
    const unregister = registerScrollGroup('/compat/react-native-gesture-handler')

    navigate('/compat/react-native-gesture-handler')
    scrollTo.mockClear()

    act(() => subscriptions.loading?.('loading'))
    navigate('/compat/react-native-gesture-handler/pan-gesture')
    vi.runAllTimers()

    expect(scrollTo).toHaveBeenCalledWith(0, 500)

    unregister()
    vi.useRealTimers()
  })

  it('does not match a different route whose slug has the same prefix', () => {
    const unregister = registerScrollGroup('/compat/react-native')

    navigate('/compat/react-native/core')
    scrollTo.mockClear()

    act(() => subscriptions.loading?.('loading'))
    navigate('/compat/react-native-gesture-handler')

    expect(scrollTo).toHaveBeenCalledWith(0, 0)

    unregister()
  })
})
