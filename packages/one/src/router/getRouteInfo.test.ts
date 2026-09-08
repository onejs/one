import { describe, expect, it } from 'vitest'
import { getRouteInfoFromState } from './getRouteInfo'

// a hash link (/dev#stack) keeps its hash in the serialized path; route info
// must still report the bare pathname or the router never sees the pending
// navigation land and serializes the stale state to history
describe('getRouteInfoFromState', () => {
  const state = {
    routes: [{ name: 'dev', path: '/dev#stack', params: { '#': 'stack' } }],
  } as any

  it('drops the hash from pathname and segments', () => {
    const info = getRouteInfoFromState(
      (_state, asPath) => ({
        path: asPath ? '/(site)/dev#stack' : '/dev#stack',
        params: { '#': 'stack' },
      }),
      state
    )
    expect(info.pathname).toBe('/dev')
    expect(info.segments).toEqual(['(site)', 'dev'])
    expect(info.unstable_globalHref).toBe('/dev#stack')
  })

  it('drops the query and the hash together', () => {
    const info = getRouteInfoFromState(
      () => ({ path: '/dev?x=1#stack', params: { x: '1', '#': 'stack' } }),
      state
    )
    expect(info.pathname).toBe('/dev')
    expect(info.segments).toEqual(['dev'])
  })
})
