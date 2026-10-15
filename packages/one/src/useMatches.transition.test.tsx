import React, { startTransition, Suspense, useLayoutEffect, useState } from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { afterEach, expect, it, vi } from 'vitest'
import { setClientMatches, updateMatchLoaderData, useMatches } from './useMatches'
import { useLoader } from './useLoader'

const mocks = vi.hoisted(() => ({ context: null as unknown as React.Context<string> }))
vi.mock('./vite/one-server-only', () => ({ useServerContext: () => undefined }))
vi.mock('./router/router', () => ({
  preloadedLoaderData: {},
  preloadingLoader: {},
  routeNode: null,
}))
vi.mock('./router/imperative-api', () => ({ router: {} }))
vi.mock('./hooks', async () => {
  const React = await import('react')
  mocks.context = React.createContext('/first')
  return { useParams: () => ({}), usePathname: () => React.useContext(mocks.context) }
})

let renderer: TestRenderer.ReactTestRenderer | undefined

afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount())
  renderer = undefined
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it.each(['matches', 'loader'] as const)(
  'keeps %s with the committed route while navigation suspends',
  async (hook) => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.stubGlobal('window', {})
    vi.stubEnv('VITE_ENVIRONMENT', 'client')
    setClientMatches([
      { routeId: './[slug]', pathname: '/first', params: {}, loaderData: 'first' },
    ])
    let finish!: () => void
    const pending = new Promise<void>((done) => {
      finish = done
    })
    let loaded = false
    let navigate!: (path: string) => void
    const commits: Array<{ path: string; match: string; data: unknown }> = []

    function Page({ path }: { path: string }) {
      if (path === '/second' && !loaded) throw pending
      return path
    }

    function Data({ path }: { path: string }) {
      const data = useLoader(() => './[slug]')
      useLayoutEffect(() => {
        if (hook === 'loader') commits.push({ path, match: path, data })
      }, [path, data])
      return null
    }

    function App() {
      const matches = useMatches()
      const [path, setPath] = useState(matches[0].pathname)
      navigate = setPath
      useLayoutEffect(() => {
        if (hook === 'matches')
          commits.push({ path, match: matches[0].pathname, data: matches[0].loaderData })
      }, [path, matches])
      return (
        <mocks.context.Provider value={path}>
          {hook === 'loader' && <Data path={path} />}
          <Suspense fallback="loading">
            <Page path={path} />
          </Suspense>
        </mocks.context.Provider>
      )
    }

    await act(async () => {
      renderer = TestRenderer.create(<App />)
    })
    expect(commits).toEqual([{ path: '/first', match: '/first', data: 'first' }])
    try {
      await act(async () => {
        startTransition(() => {
          setClientMatches([
            {
              routeId: './[slug]',
              pathname: '/second',
              params: {},
              loaderData: 'second',
            },
          ])
          navigate('/second')
        })
      })
      expect(renderer!.toJSON()).toBe('/first')
      expect(commits).toEqual([{ path: '/first', match: '/first', data: 'first' }])
    } finally {
      await act(async () => {
        loaded = true
        finish()
        await pending
      })
    }
    expect(renderer!.toJSON()).toBe('/second')
    expect(commits).toEqual([
      { path: '/first', match: '/first', data: 'first' },
      { path: '/second', match: '/second', data: 'second' },
    ])
    await act(async () => {
      updateMatchLoaderData('./[slug]', 'refetched')
    })
    expect(commits.at(-1)).toEqual({
      path: '/second',
      match: '/second',
      data: 'refetched',
    })
    await act(async () => renderer!.unmount())
    renderer = undefined
    await act(async () => {
      renderer = TestRenderer.create(<App />)
    })
    expect(commits.at(-1)).toEqual({
      path: '/second',
      match: '/second',
      data: 'refetched',
    })
  }
)
