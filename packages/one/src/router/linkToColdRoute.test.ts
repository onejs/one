import { createNavigationContainerRef } from '@react-navigation/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { One } from '../vite/types'
import { initialize, replace, routeNode } from './router'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('navigation to a cold route', () => {
  it.each([
    ['native', 'development', true, false, false],
    ['web', 'development', false, false, false],
    ['native', 'production', false, false, false],
    ['web', 'production', false, false, false],
    ['native', 'development', false, true, false],
    ['native', 'development', false, false, true],
  ] as const)(
    '%s %s dispatches before loading: %s',
    async (target, mode, early, configOptOut, runtimeOptOut) => {
      vi.useFakeTimers()
      vi.stubEnv('TAMAGUI_TARGET', target)
      vi.stubEnv('NODE_ENV', mode)
      vi.stubEnv('ONE_SUSPEND_ROUTES_NATIVE', configOptOut ? '0' : '1')
      vi.stubGlobal('__ONE_DISABLE_SUSPENSE_ROUTES__', runtimeOptOut)
      vi.stubGlobal('__vxrnHeadless', true)

      const files = {
        './_layout.tsx': { default: () => null },
        './index.tsx': { default: () => null },
        './other.tsx': { default: () => null },
      }
      const context = ((id: string) => files[id]) as One.RouteContext
      context.keys = () => Object.keys(files)
      context.resolve = (id) => id
      context.id = 'cold-route'

      const navigator = {
        isReady: () => true,
        getRootState: () => ({
          key: 'stack-1',
          type: 'stack',
          index: 0,
          stale: false,
          routeNames: ['index', 'other'],
          routes: [{ key: 'index-1', name: 'index' }],
        }),
        getCurrentRoute: () => ({ key: 'index-1', name: 'index' }),
        resetRoot: vi.fn(),
        dispatch: vi.fn(),
        addListener: () => () => {},
        removeListener: () => {},
      }
      const ref = createNavigationContainerRef()
      ref.current = navigator as any
      initialize(context, ref as any, new URL('http://one.test/'))

      let resolve!: () => void
      const pending = new Promise<void>((done) => {
        resolve = done
      })
      let onLoad!: () => void
      const loading = new Promise<void>((done) => {
        onLoad = done
      })
      const route = routeNode!.children.find((node) => node.route === 'other')!
      const loadRoute = vi.fn(() => {
        onLoad()
        throw pending
      })
      route.loadRoute = loadRoute

      const navigation = replace('/other')
      try {
        await loading
        expect(loadRoute).toHaveBeenCalledOnce()
        expect(navigator.resetRoot.mock.calls.length).toBe(early ? 1 : 0)
      } finally {
        resolve()
        await navigation
      }
      expect(navigator.resetRoot).toHaveBeenCalledOnce()
      expect(navigator.resetRoot.mock.calls[0][0].routes[0].name).toBe('other')
    }
  )
})
