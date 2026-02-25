import { describe, expect, it } from 'vitest'
import { getServerManifest } from './getServerManifest'
import type { RouteNode } from '../router/Route'

function makeRouteNode(overrides: Partial<RouteNode>): RouteNode {
  return {
    loadRoute: () => ({}),
    contextKey: '',
    route: '',
    children: [],
    dynamic: null,
    type: 'ssg',
    ...overrides,
  } as RouteNode
}

describe('getServerManifest route specificity', () => {
  it('static segment /blog/[slug] should come before fully dynamic /[a]/[b]', () => {
    // simulates: (site)/blog/[slug]+ssg.tsx vs (chat)/[serverId]/[channelId]/index.tsx
    const root = makeRouteNode({
      route: '',
      children: [
        // group (site) with blog/[slug]
        makeRouteNode({
          route: '(site)',
          children: [
            makeRouteNode({
              route: 'blog/[slug]',
              contextKey: '(site)/blog/[slug]+ssg.tsx',
              type: 'ssg',
              dynamic: [{ name: 'slug', deep: false }],
              children: [],
            }),
          ],
        }),
        // group (chat) with [serverId]/[channelId]
        makeRouteNode({
          route: '(chat)',
          children: [
            makeRouteNode({
              route: '[serverId]',
              dynamic: [{ name: 'serverId', deep: false }],
              children: [
                makeRouteNode({
                  route: '[channelId]',
                  dynamic: [{ name: 'channelId', deep: false }],
                  children: [
                    makeRouteNode({
                      route: 'index',
                      contextKey: '(chat)/[serverId]/[channelId]/index.tsx',
                      type: 'spa',
                      children: [],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })

    const manifest = getServerManifest(root)
    const pages = manifest.pageRoutes.map((r) => r.file)

    const blogIdx = pages.indexOf('(site)/blog/[slug]+ssg.tsx')
    const chatIdx = pages.indexOf('(chat)/[serverId]/[channelId]/index.tsx')

    expect(blogIdx).toBeGreaterThanOrEqual(0)
    expect(chatIdx).toBeGreaterThanOrEqual(0)
    // blog route (static first segment) must come before chat route (all dynamic)
    expect(blogIdx).toBeLessThan(chatIdx)
  })

  it('/blog should come before /[slug]', () => {
    const root = makeRouteNode({
      route: '',
      children: [
        makeRouteNode({
          route: 'blog',
          contextKey: 'blog.tsx',
          type: 'ssg',
          children: [],
        }),
        makeRouteNode({
          route: '[slug]',
          contextKey: '[slug].tsx',
          type: 'ssr',
          dynamic: [{ name: 'slug', deep: false }],
          children: [],
        }),
      ],
    })

    const manifest = getServerManifest(root)
    const pages = manifest.pageRoutes.map((r) => r.file)
    expect(pages.indexOf('blog.tsx')).toBeLessThan(pages.indexOf('[slug].tsx'))
  })

  it('/blog/hello-world should match blog route first, not [serverId]/[channelId]', () => {
    const root = makeRouteNode({
      route: '',
      children: [
        makeRouteNode({
          route: '(site)',
          children: [
            makeRouteNode({
              route: 'blog/[slug]',
              contextKey: '(site)/blog/[slug]+ssg.tsx',
              type: 'ssg',
              dynamic: [{ name: 'slug', deep: false }],
              children: [],
            }),
          ],
        }),
        makeRouteNode({
          route: '(chat)',
          children: [
            makeRouteNode({
              route: '[serverId]',
              dynamic: [{ name: 'serverId', deep: false }],
              children: [
                makeRouteNode({
                  route: '[channelId]',
                  dynamic: [{ name: 'channelId', deep: false }],
                  children: [
                    makeRouteNode({
                      route: 'index',
                      contextKey: '(chat)/[serverId]/[channelId]/index.tsx',
                      type: 'spa',
                      children: [],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })

    const manifest = getServerManifest(root)

    // find first matching route for /blog/hello-world
    const pathname = '/blog/hello-world'
    const matched = manifest.pageRoutes.find((route) => {
      return new RegExp(route.namedRegex).test(pathname)
    })

    expect(matched?.file).toBe('(site)/blog/[slug]+ssg.tsx')
  })

  it('[slug] should come before [...catchAll]', () => {
    const root = makeRouteNode({
      route: '',
      children: [
        makeRouteNode({
          route: '[...catchAll]',
          contextKey: '[...catchAll].tsx',
          type: 'ssr',
          dynamic: [{ name: 'catchAll', deep: true }],
          children: [],
        }),
        makeRouteNode({
          route: '[slug]',
          contextKey: '[slug].tsx',
          type: 'ssr',
          dynamic: [{ name: 'slug', deep: false }],
          children: [],
        }),
      ],
    })

    const manifest = getServerManifest(root)
    const pages = manifest.pageRoutes.map((r) => r.file)
    expect(pages.indexOf('[slug].tsx')).toBeLessThan(pages.indexOf('[...catchAll].tsx'))
  })
})
