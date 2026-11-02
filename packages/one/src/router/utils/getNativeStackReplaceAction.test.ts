import { StackRouter } from '@react-navigation/routers'
import { describe, expect, it } from 'vitest'
import { getNativeStackReplaceAction } from './getNativeStackReplaceAction'

describe('native stack replace', () => {
  it('replaces a nested dynamic screen without losing the screen beneath it', () => {
    const state = {
      stale: false as const,
      type: 'stack',
      key: 'hymn-stack',
      index: 1,
      routeNames: ['index', 'hymns/[number]'],
      routes: [
        { name: 'index', key: 'index-key' },
        { name: 'hymns/[number]', key: 'hymn-key', params: { number: '8' } },
      ],
      retainedRouteKeys: [],
    }
    const desired = { routes: [{ name: 'hymns/[number]', params: { number: '100' } }] }
    const action = getNativeStackReplaceAction(desired, state)

    expect(action).toMatchObject({
      type: 'REPLACE',
      source: 'hymn-key',
      target: 'hymn-stack',
      payload: { name: 'hymns/[number]', params: { number: '100' } },
    })
    const next = StackRouter({}).getStateForAction(state, action!, {
      routeNames: state.routeNames,
      routeParamList: {},
      routeGetIdList: {},
    })
    expect(next?.routes.map((route) => route.name)).toEqual(['index', 'hymns/[number]'])
    expect(next?.routes[1].params).toEqual({ number: '100' })
  })

  it('keeps the changed dynamic parent when the screen contains a nested navigator', () => {
    const state = {
      stale: false as const,
      type: 'stack',
      key: 'outer',
      index: 0,
      routeNames: ['teams/[team]'],
      routes: [{
        name: 'teams/[team]',
        key: 'team-key',
        params: { team: 'old' },
        state: { stale: false as const, type: 'stack', key: 'inner', index: 0, routeNames: ['index'], routes: [{ name: 'index', key: 'child' }] },
      }],
      retainedRouteKeys: [],
    }
    const desired = { routes: [{ name: 'teams/[team]', params: { team: 'new' }, state: { routes: [{ name: 'index' }] } }] }

    expect(getNativeStackReplaceAction(desired, state)).toMatchObject({
      type: 'REPLACE',
      target: 'outer',
      source: 'team-key',
      payload: { name: 'teams/[team]', params: { team: 'new', screen: 'index' } },
    })
  })
})
