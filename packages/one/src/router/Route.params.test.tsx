import React from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useActiveParams, useParams } from '../hooks'
import { Route, type RouteNode } from './Route'

const active = vi.hoisted(() => ({
  native: true,
  params: { projectId: 'active', mode: 'global' },
}))

vi.mock('../constants', () => ({
  get isNative() {
    return active.native
  },
}))
vi.mock('./imperative-api', () => ({ router: {} }))
vi.mock('./router', () => ({
  routeInfo: { unstable_globalHref: '/projects/active' },
  navigationRef: {},
  useStoreRootState: () => undefined,
  useStoreRouteInfo: () => ({ params: active.params }),
}))
vi.mock('./linkingConfig', () => ({
  getResolvedLinking: () => ({
    getStateFromPath: () => ({
      routes: [{ name: '[projectId]', params: active.params }],
    }),
  }),
}))
vi.mock('./RouteInfoContext', async () => {
  const { createContext } = await import('react')
  return {
    RouteInfoContext: createContext(undefined),
    RouteInfoContextProvider: ({ children }: { children: React.ReactNode }) => children,
  }
})
vi.mock('../vite/one-server-only', () => ({ getServerContext: () => undefined }))

function layout(name: string, deep = false): RouteNode {
  return {
    type: 'layout',
    loadRoute: () => ({}),
    children: [],
    dynamic: [{ name, deep }],
    route: `[${name}]`,
    contextKey: `/[${name}]/_layout`,
  }
}

function Params() {
  return <pre>{JSON.stringify({ local: useParams(), active: useActiveParams() })}</pre>
}

function read(children: React.ReactNode) {
  const html = renderToString(children)
  return JSON.parse(html.replace(/^<pre>|<\/pre>$/g, '').replaceAll('&quot;', '"'))
}

beforeEach(() => {
  active.native = true
})

describe('route-owned native parameters', () => {
  it('retains an inactive layout identity while the active hook stays global', () => {
    const result = read(
      <Route
        node={layout('projectId')}
        route={{ params: { projectId: 'retained', mode: 'local' } }}
      >
        <Params />
      </Route>
    )
    expect(result.local).toEqual({ projectId: 'retained', mode: 'local' })
    expect(result.active).toEqual(active.params)
  })

  it('inherits nested identities and decodes route-owned catch-all arrays and query values', () => {
    const result = read(
      <Route node={layout('projectId')} route={{ params: { projectId: 'retained' } }}>
        <Route
          node={layout('path', true)}
          route={{ params: { path: ['first%20part', 'second'], query: 'local%20query' } }}
        >
          <Params />
        </Route>
      </Route>
    )
    expect(result.local).toEqual({
      projectId: 'retained',
      path: ['first part', 'second'],
      query: 'local query',
    })
  })

  it.each([{ projectId: 'stale', mode: 'local' }, undefined])(
    'keeps web URL recovery for stale or absent dynamic route params',
    (params) => {
      active.native = false
      const result = read(
        <Route node={layout('projectId')} route={{ params }}>
          <Params />
        </Route>
      )
      expect(result.local.projectId).toBe('active')
      expect(result.active).toEqual(active.params)
    }
  )
})
