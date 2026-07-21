import { afterEach, describe, expect, it } from 'vitest'
import {
  isRouteProtected,
  registerProtectedRoutes,
  resolveProtectedHref,
  unregisterProtectedRoutes,
} from './router'

const contextKey = '/account'

afterEach(() => {
  unregisterProtectedRoutes(contextKey)
})

describe('protected route redirects', () => {
  it('resolves a protected href to its redirect target', () => {
    registerProtectedRoutes(contextKey, new Map([['settings', '/login']]))

    expect(isRouteProtected('/account/settings?tab=billing')).toBe(true)
    expect(resolveProtectedHref('/account/settings?tab=billing')).toBe('/login')
  })

  it('blocks a protected href without an explicit target', () => {
    registerProtectedRoutes(contextKey, new Map([['settings', undefined]]))

    expect(resolveProtectedHref('/account/settings')).toBeUndefined()
  })

  it('leaves allowed and similarly prefixed routes unchanged', () => {
    registerProtectedRoutes(contextKey, new Map([['settings', '/login']]))

    expect(resolveProtectedHref('/account/profile')).toBe('/account/profile')
    expect(resolveProtectedHref('/accounting/settings')).toBe('/accounting/settings')
  })
})
