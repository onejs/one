import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { describe, expect, it } from 'vitest'
import { Protected } from '../views/Protected'
import { Screen } from '../views/Screen'
import { processNativeTabsScreens } from './nativeTabsOptions'
import { useFilterScreenChildren, withLayoutContext } from './withLayoutContext'
import { Route, type RouteNode } from '../router/Route'

function readGuardedRedirects(children: React.ReactNode) {
  let result: ReturnType<typeof useFilterScreenChildren> | undefined

  function Capture() {
    result = useFilterScreenChildren(children)
    return null
  }

  act(() => {
    TestRenderer.create(<Capture />)
  })

  return result!.guardedRedirects
}

describe('Protected redirectTo', () => {
  it('associates a failed guard redirect with each protected screen', () => {
    const redirects = readGuardedRedirects(
      <Protected guard={false} redirectTo="/login">
        <Screen name="dashboard" />
        <Screen name="settings" />
      </Protected>
    )

    expect(Array.from(redirects)).toEqual([
      ['dashboard', '/login'],
      ['settings', '/login'],
    ])
  })

  it('uses the innermost failing guard redirect', () => {
    const redirects = readGuardedRedirects(
      <Protected guard={false} redirectTo="/login">
        <Protected guard={false} redirectTo="/subscribe">
          <Screen name="premium" />
        </Protected>
      </Protected>
    )

    expect(redirects.get('premium')).toBe('/subscribe')
  })

  it('inherits a failed parent redirect through a passing child guard', () => {
    const redirects = readGuardedRedirects(
      <Protected guard={false} redirectTo="/login">
        <Protected guard>
          <Screen name="account" />
        </Protected>
      </Protected>
    )

    expect(redirects.get('account')).toBe('/login')
  })

  it('ignores redirectTo on a passing parent guard', () => {
    const redirects = readGuardedRedirects(
      <Protected guard redirectTo="/login">
        <Protected guard={false}>
          <Screen name="account" />
        </Protected>
      </Protected>
    )

    expect(redirects.has('account')).toBe(true)
    expect(redirects.get('account')).toBeUndefined()
  })
})

describe('native Tabs options', () => {
  it('rejects web-only href options instead of silently dropping them', () => {
    expect(() =>
      processNativeTabsScreens([{ name: 'hidden', options: { href: null } } as any])
    ).toThrow('Tabs.Screen "hidden" uses the web-only href option')

    const [screen] = processNativeTabsScreens([
      { name: 'dynamic', options: () => ({ href: '/elsewhere' }) } as any,
    ])
    expect(() => (screen.options as any)({})).toThrow(
      'Tabs.Screen "dynamic" uses the web-only href option'
    )
  })
})

describe('layout routes', () => {
  function route(name: string, extra: Partial<RouteNode> = {}): RouteNode {
    return {
      type: 'ssg',
      route: name,
      contextKey: `./${name}.tsx`,
      loadRoute: () => ({ default: () => null }),
      children: [],
      dynamic: null,
      ...extra,
    }
  }

  // the screen names a navigator receives for a layout with three child files
  function screenNames(options: Parameters<typeof withLayoutContext>[2]) {
    let names: string[] = []
    function Navigator({ children }: { children: React.ReactNode }) {
      names = React.Children.map(children, (child: any) => child.props.name) ?? []
      return null
    }
    const Layout = withLayoutContext(Navigator, undefined, options)
    const layout: RouteNode = {
      ...route('_layout'),
      type: 'layout',
      children: [
        route('index'),
        route('detail'),
        route('+not-found', { generated: true, internal: true }),
      ],
    }
    act(() => {
      TestRenderer.create(
        <Route node={layout}>
          <Layout>
            <Screen name="detail" />
          </Layout>
        </Route>
      )
    })
    return names
  }

  it('stacks register undeclared child files after the declared screens', () => {
    expect(screenNames({ undeclaredRoutes: true })).toEqual(['detail', 'index'])
  })

  it('other navigators keep only the declared screens', () => {
    expect(screenNames(undefined)).toEqual(['detail'])
  })
})
