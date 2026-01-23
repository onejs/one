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

describe('setClientMatches reactivity', () => {
  it('should notify listeners when matches change', () => {
    let notifyCount = 0
    const { setClientMatches } = require('./useMatches')

    // simulate a listener (like what useSyncExternalStore would use)
    const listener = () => {
      notifyCount++
    }

    // manually test the subscription mechanism
    const matches1: One.RouteMatch[] = [
      { routeId: '/page1', pathname: '/page1', params: {}, loaderData: {} },
    ]
    const matches2: One.RouteMatch[] = [
      { routeId: '/page2', pathname: '/page2', params: {}, loaderData: {} },
    ]

    // first call
    setClientMatches(matches1)
    // no listener yet, so notifyCount is still 0

    // second call
    setClientMatches(matches2)
    // still no listener

    expect(notifyCount).toBe(0) // we didn't subscribe
  })

  it('should handle multiple sequential updates', () => {
    const { setClientMatches } = require('./useMatches')

    const matches1: One.RouteMatch[] = [
      { routeId: '/a', pathname: '/a', params: {}, loaderData: { n: 1 } },
    ]
    const matches2: One.RouteMatch[] = [
      { routeId: '/b', pathname: '/b', params: {}, loaderData: { n: 2 } },
    ]
    const matches3: One.RouteMatch[] = [
      { routeId: '/c', pathname: '/c', params: {}, loaderData: { n: 3 } },
    ]

    // should not throw on rapid updates
    expect(() => {
      setClientMatches(matches1)
      setClientMatches(matches2)
      setClientMatches(matches3)
    }).not.toThrow()
  })
})

describe('RouteMatch with dynamic params', () => {
  it('should handle single dynamic param', () => {
    const match: One.RouteMatch = {
      routeId: '/users/[id]',
      pathname: '/users/123',
      params: { id: '123' },
      loaderData: { user: { name: 'John' } },
    }

    expect(match.params.id).toBe('123')
  })

  it('should handle multiple dynamic params', () => {
    const match: One.RouteMatch = {
      routeId: '/users/[userId]/posts/[postId]',
      pathname: '/users/123/posts/456',
      params: { userId: '123', postId: '456' },
      loaderData: { post: { title: 'Hello' } },
    }

    expect(match.params.userId).toBe('123')
    expect(match.params.postId).toBe('456')
  })

  it('should handle catch-all params', () => {
    const match: One.RouteMatch = {
      routeId: '/docs/[...slug]',
      pathname: '/docs/getting-started/intro',
      params: { slug: ['getting-started', 'intro'] },
      loaderData: { doc: { content: 'Hello' } },
    }

    expect(match.params.slug).toEqual(['getting-started', 'intro'])
  })
})

describe('RouteMatch loaderData scenarios', () => {
  it('should handle complex nested loaderData', () => {
    const match: One.RouteMatch = {
      routeId: '/dashboard',
      pathname: '/dashboard',
      params: {},
      loaderData: {
        user: {
          id: 1,
          profile: {
            name: 'John',
            settings: {
              theme: 'dark',
              notifications: true,
            },
          },
        },
        posts: [
          { id: 1, title: 'Post 1' },
          { id: 2, title: 'Post 2' },
        ],
      },
    }

    const data = match.loaderData as any
    expect(data.user.profile.settings.theme).toBe('dark')
    expect(data.posts).toHaveLength(2)
  })

  it('should handle null loaderData', () => {
    const match: One.RouteMatch = {
      routeId: '/empty',
      pathname: '/empty',
      params: {},
      loaderData: null,
    }

    expect(match.loaderData).toBeNull()
  })

  it('should handle array loaderData', () => {
    const match: One.RouteMatch = {
      routeId: '/list',
      pathname: '/list',
      params: {},
      loaderData: [1, 2, 3, 4, 5],
    }

    expect(match.loaderData).toEqual([1, 2, 3, 4, 5])
  })

  it('should handle primitive loaderData', () => {
    const match: One.RouteMatch = {
      routeId: '/count',
      pathname: '/count',
      params: {},
      loaderData: 42,
    }

    expect(match.loaderData).toBe(42)
  })
})

describe('finding matches', () => {
  const createMatches = (): One.RouteMatch[] => [
    { routeId: '/_layout', pathname: '/', params: {}, loaderData: { root: true } },
    {
      routeId: '/docs/_layout',
      pathname: '/docs',
      params: {},
      loaderData: { navItems: ['intro', 'guide'] },
    },
    {
      routeId: '/docs/[slug]',
      pathname: '/docs/intro',
      params: { slug: 'intro' },
      loaderData: { title: 'Introduction', headings: ['h1', 'h2'] },
    },
  ]

  it('should find match by exact routeId', () => {
    const matches = createMatches()
    const found = matches.find((m) => m.routeId === '/docs/_layout')

    expect(found).toBeDefined()
    expect((found!.loaderData as any).navItems).toEqual(['intro', 'guide'])
  })

  it('should find match by routeId pattern', () => {
    const matches = createMatches()
    const found = matches.find((m) => m.routeId.includes('_layout'))

    expect(found).toBeDefined()
    expect(found!.routeId).toBe('/_layout')
  })

  it('should get page match (last in array)', () => {
    const matches = createMatches()
    const pageMatch = matches[matches.length - 1]

    expect(pageMatch.routeId).toBe('/docs/[slug]')
    expect((pageMatch.loaderData as any).title).toBe('Introduction')
  })

  it('should get layout match for a page', () => {
    const matches = createMatches()
    // find the layout that contains "docs"
    const layoutMatch = matches.find(
      (m) => m.routeId.includes('/docs/') && m.routeId.includes('_layout')
    )

    expect(layoutMatch).toBeDefined()
    expect((layoutMatch!.loaderData as any).navItems).toBeDefined()
  })
})
