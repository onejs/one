import { describe, expect, test } from 'vitest'
import { findInterceptRoute, setNavigationType } from './interceptRoutes'
import type { RouteNode } from './Route'

function node(overrides: Partial<RouteNode> = {}): RouteNode {
  return {
    type: 'layout',
    loadRoute: () => ({}),
    children: [],
    dynamic: null,
    route: '',
    contextKey: '',
    ...overrides,
  }
}

// a feed layout at ./app/home/(tabs)/feed/_layout.tsx with a @sheet slot
// that intercepts (.)new, resolving to /home/feed/new
function tree(): RouteNode {
  const intercept = node({
    route: 'new',
    contextKey: './app/home/(tabs)/feed/@sheet/(.)new/index.tsx',
    slotName: 'sheet',
    intercept: { levels: 0, targetPath: 'new' },
  })
  const feedLayout = node({
    route: 'feed',
    contextKey: './app/home/(tabs)/feed/_layout.tsx',
    children: [node({ route: 'index', contextKey: './app/home/(tabs)/feed/index.tsx' })],
    slots: new Map([['sheet', { name: 'sheet', interceptRoutes: [intercept] }]]),
  })
  return node({
    route: '',
    contextKey: './app/_layout.tsx',
    children: [feedLayout],
  })
}

describe('findInterceptRoute', () => {
  test('matches the bare path', () => {
    setNavigationType('soft')
    const hit = findInterceptRoute('/home/feed/new', tree(), '/home/feed/patterns')
    expect(hit?.slotName).toBe('sheet')
    expect(hit?.params).toEqual({})
  })

  test('ignores query strings and hashes', () => {
    setNavigationType('soft')
    const from = '/home/feed/patterns'
    expect(findInterceptRoute('/home/feed/new?id=pe-1', tree(), from)?.slotName).toBe(
      'sheet'
    )
    expect(findInterceptRoute('/home/feed/new#form', tree(), from)?.slotName).toBe(
      'sheet'
    )
    expect(
      findInterceptRoute('/home/feed/new?id=pe-1&x=2#form', tree(), from)?.slotName
    ).toBe('sheet')
  })

  test('still rejects other paths and hard navigations', () => {
    setNavigationType('soft')
    expect(findInterceptRoute('/home/feed/other', tree(), '/home/feed/patterns')).toBeNull()
    setNavigationType('hard')
    expect(findInterceptRoute('/home/feed/new', tree(), '/home/feed/patterns')).toBeNull()
  })
})
