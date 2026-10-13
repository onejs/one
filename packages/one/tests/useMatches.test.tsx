import React, { memo } from 'react'
import { act, create } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getClientMatchesSnapshot,
  setClientMatches,
  subscribeToClientMatches,
  useMatches,
  type RouteMatch,
} from '../src/useMatches'

vi.mock('../src/vite/one-server-only', () => ({ useServerContext: () => null }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => vi.restoreAllMocks())

describe('client route matches', () => {
  it('updates the snapshot immediately and notifies after render', async () => {
    const matches = [{ routeId: './next.tsx', pathname: '/next' }] as RouteMatch[]
    const listener = vi.fn()
    const unsubscribe = subscribeToClientMatches(listener)
    try {
      setClientMatches(matches)
      expect(getClientMatchesSnapshot()).toBe(matches)
      expect(listener).not.toHaveBeenCalled()
      await Promise.resolve()
      expect(listener).toHaveBeenCalledOnce()
    } finally {
      unsubscribe()
    }
  })

  it('keeps subscribed layouts current without updating them during another render', async () => {
    const initial = [{ routeId: './index.tsx', pathname: '/' }] as RouteMatch[]
    const next = [{ routeId: './next.tsx', pathname: '/next' }] as RouteMatch[]
    setClientMatches(initial)
    await Promise.resolve()
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const Consumer = memo(function LayoutLoader() {
      return <>{useMatches()[0]?.pathname}</>
    })
    function PathnameReader({ matches }: { matches?: RouteMatch[] }) {
      if (matches) setClientMatches(matches)
      return null
    }
    function App({ matches }: { matches?: RouteMatch[] }) {
      return (
        <>
          <Consumer />
          <PathnameReader matches={matches} />
        </>
      )
    }
    let root!: ReturnType<typeof create>
    await act(async () => {
      root = create(<App />)
    })
    expect(root.toJSON()).toBe('/')
    try {
      await act(async () => {
        root.update(<App matches={next} />)
      })
      expect(root.toJSON()).toBe('/next')
      expect(
        errors.mock.calls.filter(([message]) =>
          String(message).includes('Cannot update a component')
        )
      ).toEqual([])
    } finally {
      await act(async () => root.unmount())
    }
  })

  it('does not notify a subscriber removed before the deferred notification', async () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToClientMatches(listener)
    setClientMatches([])
    unsubscribe()
    await Promise.resolve()
    expect(listener).not.toHaveBeenCalled()
  })
})
