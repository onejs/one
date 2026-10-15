import React, { startTransition, Suspense, useLayoutEffect, useState } from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { afterEach, expect, it, vi } from 'vitest'
import { setClientMatches, updateMatchLoaderData, useMatches } from './useMatches'

vi.mock('./vite/one-server-only', () => ({ useServerContext: () => undefined }))

let renderer: TestRenderer.ReactTestRenderer | undefined

afterEach(async () => {
  if (renderer) await act(async () => renderer!.unmount())
  renderer = undefined
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('keeps loader matches with the committed route while navigation suspends', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
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

  function App() {
    const matches = useMatches()
    const [path, setPath] = useState(matches[0].pathname)
    navigate = setPath
    useLayoutEffect(() => {
      commits.push({ path, match: matches[0].pathname, data: matches[0].loaderData })
    }, [path, matches])
    return (
      <Suspense fallback="loading">
        <Page path={path} />
      </Suspense>
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
          { routeId: './[slug]', pathname: '/second', params: {}, loaderData: 'second' },
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
  expect(commits.at(-1)).toEqual({ path: '/second', match: '/second', data: 'refetched' })
  await act(async () => renderer!.unmount())
  renderer = undefined
  await act(async () => {
    renderer = TestRenderer.create(<App />)
  })
  expect(commits.at(-1)).toEqual({ path: '/second', match: '/second', data: 'refetched' })
})
