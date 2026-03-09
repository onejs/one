import { describe, expect, it } from 'vitest'
import { getRoutes } from './getRoutes'
import type { One } from '../vite/types'

function createMockContext(files: Record<string, any>): One.RouteContext {
  const keys = Object.keys(files)
  const ctx = function (id: string) {
    return files[id] || {}
  } as One.RouteContext
  ctx.keys = () => keys
  ctx.resolve = (id: string) => id
  ctx.id = 'test'
  return ctx
}

function collectRoutes(node: any, routes: any[] = []): any[] {
  if (node.children?.length === 0 && node.route) {
    routes.push(node)
  }
  for (const child of node.children || []) {
    collectRoutes(child, routes)
  }
  return routes
}

describe('getRoutes', () => {
  it('should not create duplicate +not-found when one exists in a group subdirectory', () => {
    const ctx = createMockContext({
      './_layout.tsx': { default: () => null },
      './(site)/_layout.tsx': { default: () => null },
      './(site)/index.tsx': { default: () => null },
      './(site)/+not-found.tsx': { default: () => null },
    })

    const root = getRoutes(ctx, {
      ignoreEntryPoints: true,
      ignoreRequireErrors: true,
    })

    expect(root).not.toBeNull()

    const allRoutes = collectRoutes(root!)
    const notFoundRoutes = allRoutes.filter(
      (r) => r.route === '+not-found' || r.route?.endsWith('+not-found')
    )

    // should only have the user's +not-found, not a generated duplicate
    expect(notFoundRoutes).toHaveLength(1)
    expect(notFoundRoutes[0].contextKey).toBe('./(site)/+not-found.tsx')
  })

  it('should still append generated +not-found when none exists in any group', () => {
    const ctx = createMockContext({
      './_layout.tsx': { default: () => null },
      './(site)/_layout.tsx': { default: () => null },
      './(site)/index.tsx': { default: () => null },
    })

    const root = getRoutes(ctx, {
      ignoreEntryPoints: true,
      ignoreRequireErrors: true,
    })

    expect(root).not.toBeNull()

    const allRoutes = collectRoutes(root!)
    const notFoundRoutes = allRoutes.filter(
      (r) => r.route === '+not-found' || r.route?.endsWith('+not-found')
    )

    expect(notFoundRoutes).toHaveLength(1)
    expect(notFoundRoutes[0].generated).toBe(true)
  })
})
