import { findFocusedRoute } from '@react-navigation/core'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLinking } from '../fork/useLinking'
import { getMockContext } from '../testing-utils'
import { getLinkingConfig } from './getLinkingConfig'
import { getRoutes } from './getRoutes'
import {
  getResolvedLinking,
  getSSRInitialState,
  resetLinking,
  setupLinking,
} from './linkingConfig'

const browser = vi.hoisted<{
  location: URL
  history: {
    state: {
      __tempLocation?: { pathname: string; search?: string; hash?: string }
      __tempKey?: string
    } | null
  }
}>(() => {
  const browser = {
    history: { state: null },
    location: new URL('https://example.test/'),
  }
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: browser,
  })
  return browser
})

beforeEach(() => {
  browser.history.state = null
  resetLinking()
})

const nestedRoutes = () =>
  getRoutes(
    getMockContext([
      '_layout.tsx',
      'home/_layout.tsx',
      'home/[projectId]/_layout.tsx',
      'home/[projectId]/files/[...path].tsx',
    ])
  )!

describe('setupLinking', () => {
  const routes = () => getRoutes(getMockContext(['_layout.tsx', 'index.tsx']))!

  it('keeps the base getInitialURL and returns no state without a location', () => {
    resetLinking()
    const initialState = setupLinking(routes(), undefined)

    // native starts with no location: no baked-in state overrides linking,
    // and the platform getInitialURL (Linking.getInitialURL on native) stays
    // wired so a cold deep link resolves through it.
    expect(initialState).toBeUndefined()
    expect(getResolvedLinking()?.getInitialURL).toBe(
      getLinkingConfig(routes(), true).getInitialURL
    )
  })

  it('overrides getInitialURL and derives state from a location', () => {
    resetLinking()
    const initialState = setupLinking(routes(), new URL('http://localhost/'))

    expect(initialState).toBeDefined()
    expect(getResolvedLinking()?.getInitialURL?.()).toBe('http://localhost/')
  })

  it('does not leak a location override into a later location-less setup', () => {
    resetLinking()
    setupLinking(routes(), new URL('http://localhost/'))
    resetLinking()
    setupLinking(routes(), undefined)

    expect(getResolvedLinking()?.getInitialURL).toBe(
      getLinkingConfig(routes(), true).getInitialURL
    )
  })
})

describe.each([
  { name: 'client', initialize: setupLinking },
  { name: 'SSR', initialize: getSSRInitialState },
])('$name initial location', ({ initialize }) => {
  it.each([
    ['/home/retained/files/first/second#details', 'details'],
    ['/home/retained/files/first/second?mode=local#details', 'details'],
    ['/home/retained/files/first/second?mode=left%23right#part%202', 'part%202'],
    ['/home/retained/files/first/second?mode=local', undefined],
  ])('round-trips %s through the actual route parser', (href, fragment) => {
    const tree = nestedRoutes()
    const state = initialize(tree, new URL(href, 'https://example.test'))!
    const focused = findFocusedRoute(state)!
    const linking = getLinkingConfig(tree, true)

    expect(focused.params).toMatchObject({
      projectId: 'retained',
      path: ['first', 'second'],
    })
    if (fragment === undefined) {
      expect(focused.params).not.toHaveProperty('#')
    } else {
      expect(focused.params).toHaveProperty('#', fragment)
    }
    expect(linking.getPathFromState!(state, linking.config)).toBe(href)
  })
})

it('keeps fragment-specific SSR cache entries separate and clears the fragment', () => {
  const tree = nestedRoutes()
  const base = 'https://example.test/home/retained/files/first/second?mode=local'
  const first = getSSRInitialState(tree, new URL(`${base}#first`))!
  const second = getSSRInitialState(tree, new URL(`${base}#second`))!
  const cleared = getSSRInitialState(tree, new URL(base))!

  expect(findFocusedRoute(first)?.params).toHaveProperty('#', 'first')
  expect(findFocusedRoute(second)?.params).toHaveProperty('#', 'second')
  expect(findFocusedRoute(cleared)?.params).not.toHaveProperty('#')
  expect(second).not.toBe(first)
  expect(cleared).not.toBe(first)
  expect(getSSRInitialState(tree, new URL(`${base}#first`))).toBe(first)
})

it('restores a masked initial location with its own query and fragment', () => {
  browser.history.state = {
    __tempLocation: {
      pathname: '/home/retained/files/first/second',
      search: '?mode=local',
      hash: '#masked',
    },
  }
  const tree = nestedRoutes()
  const state = setupLinking(tree, new URL('https://example.test/display#visible'))!
  const linking = getLinkingConfig(tree, true)

  expect(linking.getPathFromState!(state, linking.config)).toBe(
    '/home/retained/files/first/second?mode=local#masked'
  )
})

it('keeps the visible fragment when a mask is configured to unmask on reload', () => {
  browser.history.state = {
    __tempLocation: { pathname: '/other', hash: '#masked' },
    __tempKey: 'unmask',
  }
  const state = setupLinking(
    nestedRoutes(),
    new URL('https://example.test/home/retained/files/first/second#visible')
  )!

  expect(findFocusedRoute(state)?.params).toHaveProperty('#', 'visible')
})

it('restores the same masked fragment through the browser linking hook', async () => {
  browser.history.state = {
    __tempLocation: {
      pathname: '/home/retained/files/first/second',
      search: '?mode=local',
      hash: '#masked',
    },
  }
  const linking = getLinkingConfig(nestedRoutes(), true)
  let getInitialState: ReturnType<typeof useLinking>['getInitialState'] | undefined
  function Harness() {
    const linkingState = useLinking({ current: null }, linking)
    getInitialState = linkingState.getInitialState
    return null
  }

  renderToString(createElement(Harness))
  if (!getInitialState) throw new Error('linking hook did not initialize')
  const state = (await getInitialState())!

  expect(linking.getPathFromState!(state, linking.config)).toBe(
    '/home/retained/files/first/second?mode=local#masked'
  )
})
