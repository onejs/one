import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const subscriptions = vi.hoisted(() => ({
  loading: undefined as ((state: 'loading' | 'loaded') => void) | undefined,
  root: undefined as ((state: any) => void) | undefined,
}))

vi.mock('../router/lastAction', () => ({
  setLastAction: vi.fn(),
}))

vi.mock('../router/router', () => ({
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

beforeEach(() => {
  process.env.VITE_ENVIRONMENT = 'client'
  location = { pathname: '/', search: '', hash: '' }
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
    location.pathname = '/compat/react-native-gesture-handler'

    act(() => subscriptions.root?.({}))

    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('handles a query change as a first navigation', () => {
    location.search = '?platform=ios'

    act(() => subscriptions.root?.({}))

    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })
})

describe('ScrollBehavior groups', () => {
  it('preserves position between routes in the same group', () => {
    vi.useFakeTimers()
    const unregister = registerScrollGroup('/compat/react-native-gesture-handler')

    act(() => subscriptions.root?.({}))
    location.pathname = '/compat/react-native-gesture-handler'
    act(() => subscriptions.root?.({}))
    scrollTo.mockClear()

    act(() => subscriptions.loading?.('loading'))
    location.pathname = '/compat/react-native-gesture-handler/pan-gesture'
    act(() => subscriptions.root?.({}))
    vi.runAllTimers()

    expect(scrollTo).toHaveBeenCalledWith(0, 500)

    unregister()
    vi.useRealTimers()
  })

  it('does not match a different route whose slug has the same prefix', () => {
    const unregister = registerScrollGroup('/compat/react-native')

    act(() => subscriptions.root?.({}))
    location.pathname = '/compat/react-native/core'
    act(() => subscriptions.root?.({}))
    scrollTo.mockClear()

    act(() => subscriptions.loading?.('loading'))
    location.pathname = '/compat/react-native-gesture-handler'
    act(() => subscriptions.root?.({}))

    expect(scrollTo).toHaveBeenCalledWith(0, 0)

    unregister()
  })
})
