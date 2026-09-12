import { describe, expect, it } from 'vitest'
import {
  getReactNavigationRouteName,
  resolveInitialRouteNameFromState,
} from '../getReactNavigationConfig'
import type { RouteNode } from './Route'
import {
  extractParamsFromState,
  findAllRouteNodesFromState,
  findRouteNodeFromState,
} from './findRouteNode'
import { resolveParentRouteName } from './useNavigation'

function node(route: string, contextKey: string, children: RouteNode[] = []): RouteNode {
  return {
    type: children.length ? 'layout' : 'spa',
    loadRoute: () => ({}),
    children,
    dynamic: null,
    route,
    contextKey,
  }
}

describe('focused route state', () => {
  const current = node('index', './index/index.tsx')
  const preloaded = node('detail', './index/detail.tsx')
  const layout = node('index', './index/_layout.tsx', [current, preloaded])
  const root = node('', './_layout.tsx', [layout])
  const state = {
    index: 0,
    routes: [
      {
        name: getReactNavigationRouteName(layout),
        params: { layout: 'active' },
        state: {
          index: 0,
          routes: [
            { name: 'index', params: { page: 'current' } },
            { name: 'detail', params: { page: 'preloaded' } },
          ],
        },
      },
      { name: 'other', params: { root: 'preloaded' } },
    ],
  }

  it('finds the focused node through an internal layout name', () => {
    expect(findRouteNodeFromState(state, root)).toBe(current)
    expect(findAllRouteNodesFromState(state, root)).toEqual([layout, current])
  })

  it('collects params only from the focused route chain', () => {
    expect(extractParamsFromState(state)).toEqual({
      layout: 'active',
      page: 'current',
    })
  })
})

describe('filesystem paths at React Navigation boundaries', () => {
  const detail = node('detail', './index/detail.tsx')
  const index = node('index', './index/index.tsx')
  const collidingLayout = node('index', './index/_layout.tsx', [index, detail])
  const root = node('', './_layout.tsx', [collidingLayout])

  it('resolves absolute and relative parent paths to aliased screen names', () => {
    const routeNodes = [root, collidingLayout, detail]
    const routeName = getReactNavigationRouteName(collidingLayout)

    expect(resolveParentRouteName(routeNodes, '/index/detail', '/index')).toBe(routeName)
    expect(resolveParentRouteName(routeNodes, '/index/detail', '../')).toBe(routeName)
    expect(resolveParentRouteName(routeNodes, '/index/detail', '/')).toBe('')
  })

  it('uses aliased layout names while resolving a late-mounted child', () => {
    const state = {
      index: 0,
      routes: [
        {
          name: getReactNavigationRouteName(collidingLayout),
          state: {
            index: 1,
            routes: [{ name: 'index' }, { name: 'detail' }],
          },
        },
      ],
    }

    expect(resolveInitialRouteNameFromState('/index', state)).toBe('detail')
  })
})
