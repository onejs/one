import { createNavigationContainerRef } from '@react-navigation/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { One } from '../vite/types'
import { initialize, push, routeInfoSnapshot, subscribeToRootState } from './router'

function createMockContext(files: Record<string, any>): One.RouteContext {
  const keys = Object.keys(files)
  const ctx = function (id: string) {
    return files[id] || {}
  } as One.RouteContext
  ctx.keys = () => keys
  ctx.resolve = (id: string) => id
  ctx.id = 'link-to-route-info'
  return ctx
}

// a navigator that accepts the dispatch but, like react-navigation, has not
// rendered the new state yet when linkTo returns.
function mountedNavigator() {
  const state = {
    key: 'stack-1',
    type: 'stack',
    index: 0,
    routeNames: ['index', 'other'],
    routes: [{ key: 'index-1', name: 'index' }],
    stale: false,
  }
  return {
    isReady: () => true,
    getRootState: () => state,
    getCurrentRoute: () => state.routes[0],
    resetRoot: vi.fn(),
    dispatch: vi.fn(),
    addListener: () => () => {},
    removeListener: () => {},
  }
}

describe('linkTo route info', () => {
  let navigator: ReturnType<typeof mountedNavigator>

  beforeEach(() => {
    globalThis['__vxrnHeadless'] = true
    navigator = mountedNavigator()
    const ref = createNavigationContainerRef()
    ref.current = navigator as any
    initialize(
      createMockContext({
        './_layout.tsx': { default: () => null },
        './index.tsx': { default: () => null },
        './other.tsx': { default: () => null },
      }),
      ref as any,
      new URL('http://one.test/')
    )
    return () => {
      delete globalThis['__vxrnHeadless']
    }
  })

  // route info subscribers re-render ahead of the navigators' own state update.
  // a layout whose screens follow the pathname would then change its
  // navigator's route names against the old state, and that rebuild overwrites
  // the dispatched navigation. route info waits for the container instead.
  it('publishes a push only once the navigator state reaches it', async () => {
    const published = vi.fn()
    const unsubscribe = subscribeToRootState(published)

    await push('/other')
    unsubscribe()

    expect(navigator.dispatch).toHaveBeenCalledTimes(1)
    expect(published).not.toHaveBeenCalled()
    expect(routeInfoSnapshot().pathname).toBe('/')
  })
})
