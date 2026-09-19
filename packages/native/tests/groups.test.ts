import { createElement, type ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { zStackAlignments } from '../src/generated/containerTypes'
import { swiftUIValues } from '../src/generated/swiftui'
import { swipeActionsEdges } from '../src/groupTypes'
import { Swift as UnsupportedSwift } from '../src/unsupported'

// same render-element setup as components.test.ts. wrappers that read hooks
// (DisclosureGroup, Pager, Divider) cannot be called outside a render, so the
// groups conformance suite covers their behavior the way the tabs suite covers
// Tabs; what is asserted here is their contract surface below.
vi.mock('react-native', () => ({ Platform: { OS: 'ios', Version: '26.4' } }))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

let Containers: typeof import('../src/Containers.native')
let PagerModule: typeof import('../src/Pager.native')
let TabsModule: typeof import('../src/Tabs.native')
let Button: typeof import('../src/generated/Controls.native').Button

beforeAll(async () => {
  Containers = await import('../src/Containers.native')
  PagerModule = await import('../src/Pager.native')
  TabsModule = await import('../src/Tabs.native')
  Button = (await import('../src/generated/Controls.native')).Button
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

  it('renders the bare image for an icon-only button', () => {
    expect(read('ios/Generated/OneNativeButtonView.swift')).toContain(
      'Image(systemName: systemImage)'
    )
  })
})

describe('greedy containers', () => {
  it('rejects disclosure groups, tab bars, and pagers inside a measured stack', () => {
    const host = (child: React.ReactNode) => {
      const element = render(Containers.HStack, { children: child })
      return () => element.type(element.props)
    }
    // createElement never invokes the component, so hook-reading wrappers are safe
    // to nest here; only the outer stack executes.
    const nested: [ReactNode, string][] = [
      [
        createElement(Containers.DisclosureGroup, {
          children: null,
          label: 'More',
          isExpanded: false,
          onIsExpandedChange: () => {},
        }),
        'Swift.DisclosureGroup',
      ],
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
      'ControlGroup',
      'DisclosureGroup',
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

describe('group native mapping', () => {
  it('maps every overlay alignment and swipe edge the props accept', () => {
    const overlay = read('ios/OneNativeOverlayView.swift')
    for (const alignment of zStackAlignments)
      expect(overlay.includes(`case "${alignment}":`), alignment).toBe(true)
    const swipe = read('ios/OneNativeSwipeActionsView.swift')
    for (const edge of swipeActionsEdges)
      expect(swipe.includes(`"${edge}"`), edge).toBe(true)
  })

  // the bodies are small enough to read whole, so these assert the SDK call each
  // one exists for rather than re-listing every line.
  it('builds each container from its SDK view', () => {
    expect(read('ios/OneNativeControlGroupView.swift')).toContain(
      '.oneNativeControlGroupStyle(model.controlGroupStyle)'
    )
    expect(read('ios/OneNativeDisclosureGroupView.swift')).toContain(
      'DisclosureGroup(isExpanded:'
    )
    expect(read('ios/OneNativeDividerView.swift')).toContain('Divider()')
    expect(read('ios/OneNativeLinkView.swift')).toContain('Link(destination:')
    expect(read('ios/OneNativeGroupView.swift')).toContain('Group {')
    expect(read('ios/OneNativeOverlayView.swift')).toContain('.overlay(alignment:')
    expect(read('ios/OneNativeSwipeActionsView.swift')).toContain(
      '.swipeActions(edge: .leading'
    )
    expect(read('ios/OneNativePagerView.swift')).toContain('.tabViewStyle(.page)')
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
