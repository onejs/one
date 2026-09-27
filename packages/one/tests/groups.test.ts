import { createElement, type ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { swiftUIValues } from '../src/platform/generated/swiftui'
import { Swift as UnsupportedSwift } from '../src/platform/unsupported'

// same render-element setup as components.test.ts. wrappers that read hooks
// (DisclosureGroup, Pager, Divider) cannot be called outside a render, so the
// groups conformance suite covers their behavior the way the tabs suite covers
// Tabs; what is asserted here is their contract surface below.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  View: () => null,
  Text: () => null,
  Image: () => null,
  ScrollView: () => null,
  TextInput: () => null,
  // later entries win, like the real flatten; registered ids never appear here.
  StyleSheet: {
    flatten: (function flatten(
      style: unknown,
      into: Record<string, unknown> = {}
    ): Record<string, unknown> {
      if (Array.isArray(style)) style.forEach((entry) => flatten(entry, into))
      else if (style && typeof style === 'object') Object.assign(into, style)
      return into
    }) as (style: unknown) => Record<string, unknown>,
  },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

let Containers: typeof import('../src/platform/Containers.native')
let PagerModule: typeof import('../src/platform/Pager.native')
let TabsModule: typeof import('../src/platform/Tabs.native')
let Button: typeof import('../src/platform/Containers.native').Button

beforeAll(async () => {
  Containers = await import('../src/platform/Containers.native')
  PagerModule = await import('../src/platform/Pager.native')
  TabsModule = await import('../src/platform/Tabs.native')
  Button = Containers.Button
})

const render = (component: (props: never) => any, props: object): any =>
  component(props as never)

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (path: string) => readFileSync(root + path, 'utf8')
const schema = JSON.parse(read('schema.json'))
const metadata = JSON.parse(read('package.json'))
const component = (publicName: string) =>
  schema.components.find(
    (entry: { publicName: string }) => entry.publicName === publicName
  )

describe('controlgroup', () => {
  it('is unlabeled and automatic by default and passes a style it is given', () => {
    expect(render(Containers.ControlGroup, { children: null })).toMatchObject({
      type: { __component: 'OneNativeControlGroup' },
      props: { label: '', systemImage: '', controlGroupStyle: 'automatic' },
    })
    expect(
      render(Containers.ControlGroup, {
        children: null,
        label: 'Options',
        controlGroupStyle: 'palette',
      }).props
    ).toMatchObject({ label: 'Options', controlGroupStyle: 'palette' })
  })

  it('rejects a style the SDK never defined', () => {
    expect(() =>
      render(Containers.ControlGroup, { children: null, controlGroupStyle: 'fancy' })
    ).toThrow('Unknown SwiftUI ControlGroupStyle: fancy')
  })

  it('marks its children as inside a container', () => {
    expect(
      render(Containers.ControlGroup, { children: null }).props.children.props.value
    ).toBe(true)
  })
})

describe('link', () => {
  it('passes the destination and prefers composed children over the label', () => {
    expect(
      render(Containers.Link, {
        destination: 'https://expo.dev',
        label: 'Visit Expo',
      })
    ).toMatchObject({
      type: { __component: 'OneNativeLink' },
      props: { destination: 'https://expo.dev', label: 'Visit Expo' },
    })
  })

  it('rejects a missing destination, an unparseable one, and an empty label', () => {
    expect(() => render(Containers.Link, { destination: '' })).toThrow(
      'Swift.Link destination must be a non-empty string'
    )
    expect(() => render(Containers.Link, { destination: '::::' })).toThrow(
      'Swift.Link destination must be a parseable URL'
    )
    expect(() =>
      render(Containers.Link, { destination: 'https://expo.dev' })
    ).toThrow('Swift.Link needs a label or children')
  })
})

describe('group', () => {
  it('marks its children as inside a container', () => {
    expect(render(Containers.Group, { children: null })).toMatchObject({
      type: { __component: 'OneNativeGroup' },
    })
    expect(
      render(Containers.Group, { children: null }).props.children.props.value
    ).toBe(true)
  })
})

describe('view that fits', () => {
  it('uses SwiftUI both-axes default and accepts each Axis.Set option', () => {
    expect(render(Containers.ViewThatFits, { children: null }).props.axes).toBe('both')
    for (const axes of ['horizontal', 'vertical', 'both'])
      expect(render(Containers.ViewThatFits, { children: null, axes }).props.axes).toBe(axes)
    expect(component('ViewThatFits')).toMatchObject({
      layout: { kind: 'measured' }, props: { axes: { type: 'string' } },
    })
    expect(metadata.codegenConfig.ios.componentProvider.OneNativeViewThatFits)
      .toBe('OneNativeViewThatFitsComponentView')
  })

  it('rejects invalid axes, unsupported iOS, and greedy children', async () => {
    expect(() => render(Containers.ViewThatFits, { children: null, axes: 'diagonal' }))
      .toThrow('Swift.ViewThatFits axes must be one of horizontal, vertical, both')
    expect(() => render(Containers.ViewThatFits, {
      children: createElement(Containers.Form, { children: null }),
    })).toThrow('Swift.Form cannot be a child of Swift.ViewThatFits')
    const { Platform } = await import('react-native')
    const originalVersion = Platform.Version
    try {
      Object.assign(Platform, { Version: '15.7' })
      expect(() => render(Containers.ViewThatFits, { children: null }))
        .toThrow('Swift.ViewThatFits requires iOS 16 or newer')
    } finally {
      Object.assign(Platform, { Version: originalVersion })
    }
    expect(() => render(UnsupportedSwift.ViewThatFits, {}))
      .toThrow('Swift.ViewThatFits requires an iOS native build')
  })
})

describe('glass effect container', () => {
  it('preserves omitted spacing separately from signed spacing', () => {
    expect(render(Containers.GlassEffectContainer, { children: null }).props).toMatchObject({
      spacing: 0,
      hasSpacing: false,
    })
    expect(render(Containers.GlassEffectContainer, { children: null, spacing: -8 }).props)
      .toMatchObject({ spacing: -8, hasSpacing: true })
    expect(component('GlassEffectContainer')).toMatchObject({
      layout: { kind: 'measured' },
      props: { spacing: { type: 'Double' }, hasSpacing: { type: 'boolean' } },
    })
  })

  it('rejects nonfinite spacing and unsupported iOS versions', async () => {
    expect(() => render(Containers.GlassEffectContainer, { children: null, spacing: Infinity }))
      .toThrow('Swift.GlassEffectContainer spacing must be finite')
    const { Platform } = await import('react-native')
    const originalVersion = Platform.Version
    try {
      Object.assign(Platform, { Version: '25.4' })
      expect(() => render(Containers.GlassEffectContainer, { children: null }))
        .toThrow('Swift.GlassEffectContainer requires iOS 26 or newer')
    } finally {
      Object.assign(Platform, { Version: originalVersion })
    }
    expect(() => render(UnsupportedSwift.GlassEffectContainer, {}))
      .toThrow('Swift.GlassEffectContainer requires an iOS native build')
  })
})

describe('overlay', () => {
  it('centers by default and takes the alignment it is given', () => {
    expect(render(Containers.Overlay, { children: null })).toMatchObject({
      type: { __component: 'OneNativeOverlay' },
      props: { alignment: 'center' },
    })
    expect(
      render(Containers.Overlay, { children: null, alignment: 'topTrailing' }).props
        .alignment
    ).toBe('topTrailing')
  })

  it('rejects an alignment it cannot map', () => {
    expect(() =>
      render(Containers.Overlay, { children: null, alignment: 'middle' })
    ).toThrow('Swift.Overlay alignment must be one of topLeading, top, topTrailing,')
  })

  it('takes a single Content child', () => {
    expect(Containers.Overlay.Content).toBe(Containers.OverlayContent)
    const content = (key: string) =>
      createElement(Containers.OverlayContent, { children: null, key })
    expect(() =>
      render(Containers.Overlay, { children: [content('a'), content('b')] })
    ).toThrow('Swift.Overlay takes a single Overlay.Content child')
    expect(() =>
      render(Containers.Overlay, { children: content('a') }).props
    ).toBeTruthy()
  })
})

describe('swipeactions', () => {
  it('defaults an Actions group to the trailing edge with full swipe', () => {
    expect(render(Containers.SwipeActionsActions, { children: null })).toMatchObject({
      type: { __component: 'OneNativeSwipeActionsActions' },
      props: { edge: 'trailing', allowsFullSwipe: true },
    })
    expect(
      render(Containers.SwipeActionsActions, {
        children: null,
        edge: 'leading',
        allowsFullSwipe: false,
      }).props
    ).toMatchObject({ edge: 'leading', allowsFullSwipe: false })
  })

  it('rejects an edge it cannot map', () => {
    expect(() =>
      render(Containers.SwipeActionsActions, { children: null, edge: 'top' })
    ).toThrow('Swift.SwipeActions edge must be one of leading, trailing')
  })

  it('takes at most one Actions group per edge', () => {
    expect(Containers.SwipeActions.Actions).toBe(Containers.SwipeActionsActions)
    const actions = (key: string, edge?: string) =>
      createElement(Containers.SwipeActionsActions, { children: null, key, edge })
    expect(() =>
      render(Containers.SwipeActions, {
        children: [actions('a', 'leading'), actions('b', 'leading')],
      })
    ).toThrow('Swift.SwipeActions takes at most one Actions group per edge')
    expect(() =>
      render(Containers.SwipeActions, {
        children: [actions('a', 'leading'), actions('b', 'trailing')],
      }).props
    ).toBeTruthy()
  })
})

describe('button icon', () => {
  it('accepts a systemImage without a label', () => {
    expect(render(Button, { systemImage: 'star.fill' }).props).toMatchObject({
      label: '',
      systemImage: 'star.fill',
    })
  })

  it('rejects a button with neither label nor image', () => {
    expect(() => render(Button, {})).toThrow(
      'Button needs a label, a systemImage, or both'
    )
  })

  it('renders children as the label view', () => {
    function LabelView() {
      return null
    }
    const child = createElement(LabelView, { key: 'label' })
    const element = render(Button, { onPress: () => {}, children: child })
    expect(element.props.label).toBe('')
    expect(element.props.children.props.value).toBe(true)
    expect(element.props.children.props.children).toBe(child)
  })

  it('rejects a label together with children', () => {
    function LabelView() {
      return null
    }
    const child = createElement(LabelView, { key: 'label' })
    expect(() => render(Button, { label: 'Save', children: child })).toThrow(
      'Swift.Button takes either a label or children'
    )
    expect(() =>
      render(Button, { systemImage: 'star.fill', children: child })
    ).toThrow('Swift.Button takes either a label or children')
  })
})

describe('greedy containers', () => {
  it('composes a disclosure group inside measured containers', () => {
    const child = createElement(Containers.DisclosureGroup, {
      children: null,
      label: 'More',
      isExpanded: false,
      onIsExpandedChange: () => {},
    })
    const host = render(Containers.HStack, { children: child })
    expect(() => host.type(host.props)).not.toThrow()
    expect(() => render(Containers.ZStack, { children: child })).not.toThrow()
    expect(() => render(Containers.ViewThatFits, { children: child })).not.toThrow()
  })

  it('rejects tab bars and pagers inside a measured stack', () => {
    const host = (child: React.ReactNode) => {
      const element = render(Containers.HStack, { children: child })
      return () => element.type(element.props)
    }
    // createElement never invokes the component, so hook-reading wrappers are safe
    // to nest here; only the outer stack executes.
    const nested: [ReactNode, string][] = [
      [
        createElement(TabsModule.Tabs, {
          children: null,
          selection: 'a',
          onSelectionChange: () => {},
        }),
        'Swift.Tabs',
      ],
      [
        createElement(PagerModule.Pager, {
          children: null,
          selection: 'a',
          onSelectionChange: () => {},
        }),
        'Swift.Pager',
      ],
    ]
    for (const [child, name] of nested) {
      expect(host(child), name).toThrow(`${name} cannot be a child of Swift.HStack`)
      expect(
        () => render(Containers.ZStack, { children: child }),
        name
      ).toThrow(`${name} cannot be a child of Swift.ZStack`)
    }
  })
})

// the published contract: props, enum bindings, controlled values, slots, and the
// provider entries React Native's codegen mounts views through.
describe('group schema', () => {
  it('carries the round-2 containers with their props and slots', () => {
    expect(component('ControlGroup').props).toMatchObject({
      label: { type: 'string' },
      systemImage: { type: 'string' },
      controlGroupStyle: { type: 'string', enum: 'ControlGroupStyle' },
    })
    expect(component('DisclosureGroup').props).toMatchObject({
      label: { type: 'string' },
      isExpanded: { type: 'boolean' },
      acknowledgedEvent: { type: 'Int32' },
      revision: { type: 'Int32' },
    })
    expect(component('DisclosureGroup').controlled).toMatchObject({
      value: 'isExpanded',
      event: 'onNativeDisclosureGroupIsExpandedChange',
    })
    expect(component('Divider').props).toMatchObject({})
    expect(component('Divider').slots).toMatchObject([])
    expect(component('Link').props).toMatchObject({
      destination: { type: 'string' },
      label: { type: 'string' },
    })
    expect(component('Group').props).toMatchObject({})
    expect(component('Overlay').props).toMatchObject({ alignment: { type: 'string' } })
    expect(component('OverlayContent').props).toMatchObject({})
    expect(component('OverlayContent').interfaceOnly).toBe(true)
    expect(component('SwipeActions').props).toMatchObject({})
    expect(component('SwipeActionsActions').props).toMatchObject({
      edge: { type: 'string' },
      allowsFullSwipe: { type: 'boolean' },
    })
    expect(component('SwipeActionsActions').interfaceOnly).toBe(true)
    expect(component('Pager').props).toMatchObject({
      selection: { type: 'string' },
      acknowledgedEvent: { type: 'Int32' },
      revision: { type: 'Int32' },
    })
    expect(component('Pager').controlled).toMatchObject({
      value: 'selection',
      event: 'onNativePagerSelectionChange',
    })
    expect(component('Pager').slots).toMatchObject([
      { name: 'pages', content: 'OneNativeTab', key: 'tabId' },
    ])
    for (const name of [
      'Divider',
      'Link',
      'Group',
      'Overlay',
      'SwipeActions',
      'Pager',
    ]) {
      expect(component(name).layout, name).toMatchObject({ kind: 'container' })
      expect(component(name).interfaceOnly, name).toBe(false)
    }
    expect(component('DisclosureGroup').layout).toMatchObject({ kind: 'measured' })
    expect(component('DisclosureGroup').interfaceOnly).toBe(true)
    expect(component('ControlGroup').layout).toMatchObject({ kind: 'measured' })
    expect(component('ControlGroup').interfaceOnly).toBe(true)
  })

  it('registers a component view for every new container', () => {
    for (const name of [
      'OneNativeControlGroup',
      'OneNativeDisclosureGroup',
      'OneNativeDivider',
      'OneNativeLink',
      'OneNativeGroup',
      'OneNativeOverlay',
      'OneNativeOverlayContent',
      'OneNativeSwipeActions',
      'OneNativeSwipeActionsActions',
      'OneNativePager',
    ])
      expect(metadata.codegenConfig.ios.componentProvider[name]).toBe(
        `${name}ComponentView`
      )
  })

  it('binds the menu-documented control group styles', () => {
    for (const style of ['palette', 'menu', 'compactMenu'])
      expect(Object.hasOwn(swiftUIValues.ControlGroupStyle, style), style).toBe(true)
  })
})

describe('group unsupported surface', () => {
  it('throws for every new container without the native build', () => {
    for (const name of [
      'ControlGroup',
      'DisclosureGroup',
      'Divider',
      'Link',
      'Group',
      'Overlay',
      'SwipeActions',
      'Pager',
      'Page',
    ])
      expect(
        () => (UnsupportedSwift as Record<string, (props: object) => unknown>)[name]({}),
        name
      ).toThrow(`Swift.${name} requires an iOS native build`)
    const unsupported = UnsupportedSwift as Record<string, any>
    expect(() => unsupported.Overlay.Content({}), 'Overlay.Content').toThrow(
      'Swift.Overlay.Content requires an iOS native build'
    )
    expect(() => unsupported.SwipeActions.Actions({}), 'SwipeActions.Actions').toThrow(
      'Swift.SwipeActions.Actions requires an iOS native build'
    )
  })
})
