import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LoadedRoute, RouteNode } from './Route'
import { getQualifiedRouteComponent } from './useScreens'

type FallbackProps = {
  route: string
  params: Record<string, string | string[]>
}

const pendingRoute = new Promise<void>(() => {})
const previousTarget = process.env.TAMAGUI_TARGET
const previousSuspendRoutesNative = process.env.ONE_SUSPEND_ROUTES_NATIVE
const previousDisableSuspense = (globalThis as any).__ONE_DISABLE_SUSPENSE_ROUTES__

function createRouteNode(
  type: RouteNode['type'],
  route: string,
  contextKey: string,
  loadRoute: () => Partial<LoadedRoute>
): RouteNode {
  return {
    type,
    route,
    contextKey,
    loadRoute,
    children: [],
    dynamic: null,
  }
}

function SuspendingRoute(): React.ReactNode {
  throw pendingRoute
}

beforeEach(() => {
  process.env.TAMAGUI_TARGET = 'native'
  delete process.env.ONE_SUSPEND_ROUTES_NATIVE
  delete (globalThis as any).__ONE_DISABLE_SUSPENSE_ROUTES__
})

afterEach(() => {
  if (previousTarget === undefined) {
    delete process.env.TAMAGUI_TARGET
  } else {
    process.env.TAMAGUI_TARGET = previousTarget
  }
  if (previousSuspendRoutesNative === undefined) {
    delete process.env.ONE_SUSPEND_ROUTES_NATIVE
  } else {
    process.env.ONE_SUSPEND_ROUTES_NATIVE = previousSuspendRoutesNative
  }
  if (previousDisableSuspense === undefined) {
    delete (globalThis as any).__ONE_DISABLE_SUSPENSE_ROUTES__
  } else {
    ;(globalThis as any).__ONE_DISABLE_SUSPENSE_ROUTES__ = previousDisableSuspense
  }
})

describe('route SuspenseFallback', () => {
  it('inherits the layout fallback and passes the suspended route details', async () => {
    const childNode = createRouteNode(
      'spa',
      'profile/[id]',
      './(app)/profile/[id].tsx',
      () => {
        throw pendingRoute
      }
    )
    const ChildRoute = getQualifiedRouteComponent(childNode)
    const layoutNode = createRouteNode('layout', '(app)', './(app)/_layout.tsx', () => ({
      default: () => <ChildRoute route={{ params: { id: '123' } }} />,
      SuspenseFallback: ({ route, params }: FallbackProps) => (
        <div data-fallback="layout">
          {route}:{params.id}
        </div>
      ),
    }))
    const LayoutRoute = getQualifiedRouteComponent(layoutNode)

    let renderer: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<LayoutRoute />)
    })

    expect(renderer!.root.findByProps({ 'data-fallback': 'layout' }).children).toEqual([
      './(app)/profile/[id].tsx',
      ':',
      '123',
    ])
  })

  it('uses the nearest layout fallback', async () => {
    const childNode = createRouteNode('spa', 'profile', './(app)/profile.tsx', () => ({
      default: SuspendingRoute,
    }))
    const ChildRoute = getQualifiedRouteComponent(childNode)
    const nestedLayoutNode = createRouteNode(
      'layout',
      '(app)',
      './(app)/_layout.tsx',
      () => ({
        default: () => <ChildRoute />,
        SuspenseFallback: () => <div data-fallback="nested" />,
      })
    )
    const NestedLayoutRoute = getQualifiedRouteComponent(nestedLayoutNode)
    const rootLayoutNode = createRouteNode('layout', '', './_layout.tsx', () => ({
      default: () => <NestedLayoutRoute />,
      SuspenseFallback: () => <div data-fallback="root" />,
    }))
    const RootLayoutRoute = getQualifiedRouteComponent(rootLayoutNode)

    let renderer: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<RootLayoutRoute />)
    })

    expect(renderer!.root.findAllByProps({ 'data-fallback': 'nested' })).toHaveLength(1)
    expect(renderer!.root.findAllByProps({ 'data-fallback': 'root' })).toHaveLength(0)
  })

  it('ignores a SuspenseFallback exported from a leaf route', async () => {
    const childNode = createRouteNode('spa', 'profile', './profile.tsx', () => ({
      default: SuspendingRoute,
      SuspenseFallback: () => <div data-fallback="leaf" />,
    }))
    const ChildRoute = getQualifiedRouteComponent(childNode)

    let renderer: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(<ChildRoute />)
    })

    expect(renderer!.root.findAllByProps({ 'data-fallback': 'leaf' })).toHaveLength(0)
    expect(renderer!.toJSON()).toBeNull()
  })
})
