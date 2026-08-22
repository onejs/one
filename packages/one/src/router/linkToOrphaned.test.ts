import { createNavigationContainerRef } from '@react-navigation/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { One } from '../vite/types'
import { initialize, replace } from './router'

function createMockContext(files: Record<string, any>): One.RouteContext {
  const keys = Object.keys(files)
  const ctx = function (id: string) {
    return files[id] || {}
  } as One.RouteContext
  ctx.keys = () => keys
  ctx.resolve = (id: string) => id
  ctx.id = 'link-to-orphaned'
  return ctx
}

// the surface linkTo reaches for on a mounted navigator.
function mountedNavigator() {
  return {
    isReady: () => true,
    getRootState: () => ({
      key: 'stack-1',
      type: 'stack',
      index: 0,
      routeNames: ['index', 'other'],
      routes: [{ key: 'index-1', name: 'index' }],
      stale: false,
    }),
    getCurrentRoute: () => ({ key: 'index-1', name: 'index' }),
    resetRoot: vi.fn(),
    dispatch: vi.fn(),
    addListener: () => () => {},
    removeListener: () => {},
  }
}

const NOT_INITIALIZED = "hasn't been initialized yet"

function notInitializedCalls(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.filter((call) =>
    call.some((arg) => typeof arg === 'string' && arg.includes(NOT_INITIALIZED))
  )
}

describe('linkTo against a tree that went away', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>
  let ref: ReturnType<typeof createNavigationContainerRef>

  beforeEach(() => {
    // the preview shells set this; it keeps the route preload off the network so
    // the only thing under test is what linkTo does after its await.
    globalThis['__vxrnHeadless'] = true
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ref = createNavigationContainerRef()
    ref.current = mountedNavigator() as any
    initialize(
      createMockContext({
        './_layout.tsx': { default: () => null },
        './index.tsx': { default: () => null },
        './other.tsx': { default: () => null },
      }),
      ref as any,
      new URL('http://one.test/')
    )
  })

  afterEach(() => {
    errorSpy.mockRestore()
    delete globalThis['__vxrnHeadless']
  })

  // an auth gate that swaps Slot for Redirect, and a Contrast preview cold mount
  // (React root unmounted, bundle re-evaluated in the same realm), both detach the
  // container ref while linkTo is parked on its route preload. every method on a
  // detached ref logs the react-navigation not-initialized error.
  it('abandons a navigation whose navigator detached during the preload', async () => {
    const navigation = replace('/other')
    // linkTo is suspended on `await preloadRoute(...)`, so this lands before it
    // resumes. no timing involved.
    ref.current = null

    await navigation

    expect(notInitializedCalls(errorSpy)).toEqual([])
  })

  // the post-dispatch poll runs on a timer, so it outlives the tree outright.
  it('stops the post-dispatch route poll once the navigator detaches', async () => {
    await replace('/other')
    ref.current = null

    await new Promise((resolve) => setTimeout(resolve, 80))

    expect(notInitializedCalls(errorSpy)).toEqual([])
  })
})
