import { describe, expect, it } from 'vitest'
import type { ParamListBase, StackNavigationState } from '@react-navigation/native'
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'

import {
  convertStackStateToNonOverlayState,
  findLastNonOverlayIndex,
  isOverlayPresentation,
  isTransparentOverlay,
} from '../stackStateUtils'

type Descriptors = Record<string, { options: NativeStackNavigationOptions }>

function makeState(
  routeNames: string[],
  index: number
): StackNavigationState<ParamListBase> {
  const routes = routeNames.map((name) => ({
    key: `${name}-key`,
    name,
    params: undefined,
  })) as StackNavigationState<ParamListBase>['routes']
  return {
    key: 'stack',
    index,
    routeNames,
    routes,
    type: 'stack',
    stale: false,
    preloadedRoutes: [],
  } as unknown as StackNavigationState<ParamListBase>
}

function makeDescriptors(
  routeNames: string[],
  presentations: Record<string, NativeStackNavigationOptions['presentation']>
): Descriptors {
  const out: Descriptors = {}
  for (const name of routeNames) {
    out[`${name}-key`] = { options: { presentation: presentations[name] } }
  }
  return out
}

describe('isOverlayPresentation', () => {
  it('returns true for known overlay presentations', () => {
    for (const p of [
      'modal',
      'transparentModal',
      'fullScreenModal',
      'formSheet',
      'pageSheet',
      'containedModal',
      'containedTransparentModal',
    ] as const) {
      expect(isOverlayPresentation({ presentation: p })).toBe(true)
    }
  })

  it('returns false for card and undefined', () => {
    expect(isOverlayPresentation({ presentation: 'card' })).toBe(false)
    expect(isOverlayPresentation({})).toBe(false)
    expect(isOverlayPresentation(undefined)).toBe(false)
    expect(isOverlayPresentation(null)).toBe(false)
  })
})

describe('isTransparentOverlay', () => {
  it('flags transparent variants only', () => {
    expect(isTransparentOverlay({ presentation: 'transparentModal' })).toBe(true)
    expect(isTransparentOverlay({ presentation: 'containedTransparentModal' })).toBe(true)
    expect(isTransparentOverlay({ presentation: 'modal' })).toBe(false)
    expect(isTransparentOverlay({ presentation: 'formSheet' })).toBe(false)
  })
})

describe('convertStackStateToNonOverlayState', () => {
  it('removes overlay routes and keeps card routes', () => {
    const state = makeState(['home', 'detail', 'filter'], 2)
    const descriptors = makeDescriptors(['home', 'detail', 'filter'], {
      home: 'card',
      detail: 'card',
      filter: 'formSheet',
    })
    const out = convertStackStateToNonOverlayState(state, descriptors)
    expect(out.routes.map((r) => r.name)).toEqual(['home', 'detail'])
  })

  it('falls back to last remaining route when active route was an overlay', () => {
    const state = makeState(['home', 'detail', 'filter'], 2)
    const descriptors = makeDescriptors(['home', 'detail', 'filter'], {
      home: 'card',
      detail: 'card',
      filter: 'formSheet',
    })
    const out = convertStackStateToNonOverlayState(state, descriptors)
    expect(out.index).toBe(1)
    expect(out.routes[out.index]!.name).toBe('detail')
  })

  it('preserves active index when active route is not an overlay', () => {
    const state = makeState(['home', 'detail', 'filter'], 1)
    const descriptors = makeDescriptors(['home', 'detail', 'filter'], {
      home: 'card',
      detail: 'card',
      filter: 'formSheet',
    })
    const out = convertStackStateToNonOverlayState(state, descriptors)
    expect(out.routes[out.index]!.name).toBe('detail')
  })

  it('handles all-overlay state without crashing', () => {
    const state = makeState(['only-sheet'], 0)
    const descriptors = makeDescriptors(['only-sheet'], { 'only-sheet': 'formSheet' })
    const out = convertStackStateToNonOverlayState(state, descriptors)
    expect(out.routes).toHaveLength(0)
    expect(out.index).toBe(0)
  })
})

describe('findLastNonOverlayIndex', () => {
  it('returns the highest index that is not an overlay', () => {
    const state = makeState(['home', 'detail', 'filter', 'pop'], 3)
    const descriptors = makeDescriptors(['home', 'detail', 'filter', 'pop'], {
      home: 'card',
      detail: 'card',
      filter: 'formSheet',
      pop: 'transparentModal',
    })
    expect(findLastNonOverlayIndex(state, descriptors)).toBe(1)
  })

  it('returns -1 when every route is an overlay', () => {
    const state = makeState(['sheet'], 0)
    const descriptors = makeDescriptors(['sheet'], { sheet: 'formSheet' })
    expect(findLastNonOverlayIndex(state, descriptors)).toBe(-1)
  })
})
