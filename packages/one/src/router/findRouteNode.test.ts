import { describe, expect, it } from 'vitest'
import { getReactNavigationRouteName } from '../getReactNavigationConfig'
import type { RouteNode } from './Route'
import {
  extractParamsFromState,
  findAllRouteNodesFromState,
  findRouteNodeFromState,
} from './findRouteNode'

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
