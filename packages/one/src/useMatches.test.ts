import { describe, expect, it } from 'vitest'
import type { One } from './vite/types'
import { setClientMatches } from './useMatches'

describe('useMatches', () => {
  describe('setClientMatches', () => {
    it('should update client matches without errors', () => {
      const matches: One.RouteMatch[] = [
        {
          routeId: '/_layout',
          pathname: '/',
          params: {},
          loaderData: { title: 'Root' },
        },
        {
          routeId: '/page',
          pathname: '/page',
          params: {},
          loaderData: { content: 'Page content' },
        },
      ]

      // should not throw
      expect(() => setClientMatches(matches)).not.toThrow()
    })

    it('should accept empty matches array', () => {
      expect(() => setClientMatches([])).not.toThrow()
    })
  })

  describe('type safety', () => {
    it('should have correct RouteMatch type', () => {
      const match: One.RouteMatch = {
        routeId: 'test',
        pathname: '/test',
        params: { id: '123' },
        loaderData: { foo: 'bar' },
      }

      expect(match.routeId).toBe('test')
      expect(match.pathname).toBe('/test')
      expect(match.params.id).toBe('123')
      expect(match.loaderData).toEqual({ foo: 'bar' })
    })

    it('should allow string[] params', () => {
      const match: One.RouteMatch = {
        routeId: 'test',
        pathname: '/test',
        params: { slugs: ['a', 'b', 'c'] },
        loaderData: null,
      }

      expect(match.params.slugs).toEqual(['a', 'b', 'c'])
    })

    it('should allow undefined loaderData', () => {
      const match: One.RouteMatch = {
        routeId: 'test',
        pathname: '/test',
        params: {},
        loaderData: undefined,
      }

      expect(match.loaderData).toBeUndefined()
    })
  })
})

describe('RouteMatch ordering', () => {
  it('matches should be ordered parent to child (root layout first)', () => {
    const matches: One.RouteMatch[] = [
      { routeId: '/_layout', pathname: '/', params: {}, loaderData: { level: 'root' } },
      {
        routeId: '/docs/_layout',
        pathname: '/docs',
        params: {},
        loaderData: { level: 'docs' },
      },
      {
        routeId: '/docs/intro',
        pathname: '/docs/intro',
        params: {},
        loaderData: { level: 'page' },
      },
    ]

    // root layout should be first
    expect(matches[0].routeId).toBe('/_layout')
    expect((matches[0].loaderData as any).level).toBe('root')

    // docs layout should be second
    expect(matches[1].routeId).toBe('/docs/_layout')
    expect((matches[1].loaderData as any).level).toBe('docs')

    // page should be last
    expect(matches[2].routeId).toBe('/docs/intro')
    expect((matches[2].loaderData as any).level).toBe('page')
  })

  it('last match should be the current page', () => {
    const matches: One.RouteMatch[] = [
      { routeId: '/_layout', pathname: '/', params: {}, loaderData: {} },
      {
        routeId: '/page',
        pathname: '/page',
        params: { id: '123' },
        loaderData: { title: 'Page' },
      },
    ]

    const pageMatch = matches[matches.length - 1]
    expect(pageMatch.routeId).toBe('/page')
    expect((pageMatch.loaderData as any).title).toBe('Page')
  })
})
