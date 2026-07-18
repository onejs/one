import { describe, expect, test } from 'vitest'
import { getPreloadPath } from '../utils/cleanUrl'
import { getRouteArtifactPaths } from './getRouteArtifactPath'
import type { RouteNode } from './Route'

function routeNode(
  route: string,
  contextKey: string,
  children: RouteNode[] = [],
  type: RouteNode['type'] = children.length ? 'layout' : 'spa'
): RouteNode {
  return {
    type,
    loadRoute: () => ({}),
    children,
    dynamic: null,
    route,
    contextKey,
  }
}

describe('getRouteArtifactPath', () => {
  test('uses the emitted route pattern for a concrete dynamic href', () => {
    const page = routeNode(
      '[serverId]/[channelId]/index',
      './(chat)/[serverId]/[channelId]/index.tsx'
    )
    const chat = routeNode('(chat)', './(chat)/_layout.tsx', [page])
    const root = routeNode('', './_layout.tsx', [chat])
    const linking = {
      config: { screens: {} },
      getStateFromPath: () => ({
        routes: [
          {
            name: '(chat)',
            state: { routes: [{ name: '[serverId]/[channelId]/index' }] },
          },
        ],
      }),
    }

    const artifactPaths = getRouteArtifactPaths(
      '/acme/general?message=message-1&thread=thread-1',
      linking,
      root
    )

    expect(artifactPaths).toEqual({
      loader: '/:serverId/:channelId/',
      preload: '/:serverId/:channelId/',
    })
    expect(getPreloadPath(artifactPaths.preload)).toMatch(
      /\/assets\/=3aserverId_=3achannelId_\d+_preload\.js$/
    )
  })

  test('keeps the href when the router cannot resolve a route', () => {
    const root = routeNode('', './_layout.tsx')
    const href = '/unknown?from=test'

    expect(
      getRouteArtifactPaths(
        href,
        { config: { screens: {} }, getStateFromPath: () => undefined },
        root
      )
    ).toEqual({ loader: href, preload: href })
  })

  test.each([
    [
      'ssg',
      {
        loader: '/blog/intro?from=test',
        preload: '/blog/intro?from=test',
      },
    ],
    [
      'ssr',
      {
        loader: '/blog/intro?from=test',
        preload: '/blog/:slug',
      },
    ],
  ] as const)('keeps %s artifacts on their build-time paths', (type, expected) => {
    const page = routeNode('blog/[slug]', './blog/[slug].tsx', [], type)
    const root = routeNode('', './_layout.tsx', [page])

    expect(
      getRouteArtifactPaths(
        '/blog/intro?from=test',
        {
          config: { screens: {} },
          getStateFromPath: () => ({ routes: [{ name: 'blog/[slug]' }] }),
        },
        root
      )
    ).toEqual(expected)
  })
})
