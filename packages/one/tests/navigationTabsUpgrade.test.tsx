import { createElement } from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('react-native', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-native')>()
  return {
    ...original,
    Platform: {
      OS: 'ios',
      Version: '27.0',
      select: (values: any) => values.ios ?? values.default,
    },
    PlatformColor: (name: string) => name,
  }
})
vi.mock('@react-navigation/native', async () => ({
  ...(await import('@react-navigation/routers')),
  useLocale: () => ({ direction: 'ltr' }),
  useTheme: () => ({
    dark: false,
    colors: {
      background: '#ffffff',
      primary: '#336699',
      text: '#222222',
      notification: '#ff0000',
    },
    fonts: {
      medium: { fontFamily: 'system', fontWeight: '500' },
      regular: { fontFamily: 'system', fontWeight: '400' },
    },
  }),
}))
vi.mock('@react-navigation/elements', () => ({
  getLabel: (options: any) => options.label ?? options.title ?? options.fallback,
  getHeaderTitle: (options: any, name: string) => options.title ?? name,
  Header: 'header',
}))
vi.mock('@react-navigation/elements/internal', async () => ({
  Color: (await import('../../../node_modules/@react-navigation/elements/src/Color'))
    .Color,
  ActivityView: 'activity',
  SafeAreaProviderCompat: 'safe-area',
  Screen: 'screen-content',
}))
vi.mock('react-native-screens', () => ({
  Tabs: { Host: 'tabs-host', Screen: 'tabs-screen' },
}))

// exercise the installed package entry used by native bundles, including the retained patch.
import { BottomTabViewNative } from '../../../node_modules/@react-navigation/bottom-tabs/lib/module/views/BottomTabViewNativeImpl'

function fixture(options: Record<string, any> = {}) {
  const routes = [
    { key: 'home', name: 'Home' },
    { key: 'search', name: 'Search' },
  ]
  const state = {
    stale: false,
    type: 'tab',
    key: 'tabs',
    index: 0,
    routeNames: ['Home', 'Search'],
    routes,
    preloadedRouteKeys: [],
    history: [],
  }
  const navigation = {
    emit: vi.fn(() => ({ defaultPrevented: false })),
    dispatch: vi.fn(),
  }
  const descriptors = Object.fromEntries(
    routes.map((route) => [
      route.key,
      {
        route,
        navigation,
        options: {
          lazy: false,
          tabBarActiveTintColor: '#336699',
          tabBarInactiveTintColor: '#777777',
          ...options[route.key],
        },
        render: () => createElement('content', { name: route.name }),
      },
    ])
  )
  let tree!: TestRenderer.ReactTestRenderer
  act(() => {
    tree = TestRenderer.create(
      createElement(BottomTabViewNative, { state, navigation, descriptors } as any)
    )
  })
  return { tree, navigation }
}

const host = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findByType('tabs-host' as any)

describe('Navigation 8 tabs with Screens 4.30', () => {
  it('maps the existing prominent option to the upstream host and clears it on update', () => {
    const { tree } = fixture({ search: { tabBarProminent: true } })
    expect(host(tree).props.ios.prominentScreenKey).toBe('search')
    const props = tree.root.findByType(BottomTabViewNative).props
    act(() =>
      tree.update(
        createElement(BottomTabViewNative, {
          ...props,
          descriptors: {
            ...props.descriptors,
            search: { ...props.descriptors.search, options: {} },
          },
        })
      )
    )
    expect(host(tree).props.ios.prominentScreenKey).toBeUndefined()
    act(() => tree.unmount())
  })

  it('retains explicit ripple colors and sets focused and disabled item colors', () => {
    const { tree } = fixture({ home: { tabBarRippleColor: '#abcdef' } })
    const appearance = tree.root.findAllByType('tabs-screen' as any)[0]!.props.android
      .standardAppearance
    expect(appearance.tabBarItemRippleColor).toBe('#abcdef')
    expect(appearance.focused).toEqual(appearance.normal)
    expect(appearance.disabled).toEqual(appearance.normal)
    expect(appearance.selected.tabBarItemIconColor).toBe('#336699')
    act(() => tree.unmount())
  })

  it('derives the default ripple and dispatches user selection while keeping repeated selection local', () => {
    const { tree, navigation } = fixture()
    const appearance = tree.root.findAllByType('tabs-screen' as any)[0]!.props.android
      .standardAppearance
    expect(appearance.tabBarItemRippleColor).toBe('rgba(51, 102, 153, 0.12)')
    act(() =>
      host(tree).props.onTabSelected({
        nativeEvent: {
          selectedScreenKey: 'search',
          provenance: 1,
          actionOrigin: 'user',
          isRepeated: false,
        },
      })
    )
    expect(navigation.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'NAVIGATE',
        payload: expect.objectContaining({ name: 'Search' }),
        target: 'tabs',
      })
    )
    navigation.dispatch.mockClear()
    act(() =>
      host(tree).props.onTabSelected({
        nativeEvent: {
          selectedScreenKey: 'home',
          provenance: 2,
          actionOrigin: 'user',
          isRepeated: true,
        },
      })
    )
    expect(navigation.dispatch).not.toHaveBeenCalled()
    expect(navigation.emit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        type: 'tabPress',
        data: { origin: 'native', behavior: { popToTop: true, scrollToTop: true } },
      })
    )
    act(() => tree.unmount())
  })
})
