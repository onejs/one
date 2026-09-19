import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import Yoga from 'yoga-layout'
import {
  lazyHStackAlignments,
  lazyVStackAlignments,
  scrollViewAxes,
} from '../src/listTypes'
import { swiftUIValues } from '../src/generated/swiftui'
import { Swift as UnsupportedSwift } from '../src/unsupported'

// same render-element setup as components.test.ts: the wrappers are plain functions
// over mocked specs, so a test reads the element they build.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  StyleSheet: {
    flatten: (style: unknown): object | undefined =>
      Array.isArray(style)
        ? Object.assign(
            {},
            ...style
              .filter(Boolean)
              .map((item) =>
                Array.isArray(item) ? Object.assign({}, ...item.filter(Boolean)) : item
              )
          )
        : (style as object | undefined),
  },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

let Containers: typeof import('../src/Containers.native')

beforeAll(async () => {
  Containers = await import('../src/Containers.native')
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

describe('list', () => {
  it('takes the automatic style by default and passes one it is given', () => {
    expect(render(Containers.List, { children: null })).toMatchObject({
      type: { __component: 'OneNativeList' },
      props: { listStyle: 'automatic' },
    })
    expect(
      render(Containers.List, { children: null, listStyle: 'insetGrouped' }).props
        .listStyle
    ).toBe('insetGrouped')
  })

  it('rejects a style the SDK never defined', () => {
    expect(() => render(Containers.List, { children: null, listStyle: 'fancy' })).toThrow(
      'Unknown SwiftUI ListStyle: fancy'
    )
  })

  it('marks its children as inside a container', () => {
    expect(render(Containers.List, { children: null }).props.children.props.value).toBe(
      true
    )
  })
})

describe('scrollview', () => {
  it('scrolls vertically with indicators unless told otherwise', () => {
    expect(render(Containers.ScrollView, { children: null })).toMatchObject({
      type: { __component: 'OneNativeScrollView' },
      props: { axes: 'vertical', showsIndicators: true },
    })
    expect(
      render(Containers.ScrollView, {
        children: null,
        axes: 'horizontal',
        showsIndicators: false,
      }).props
    ).toMatchObject({ axes: 'horizontal', showsIndicators: false })
  })

  it('rejects an axis it cannot map', () => {
    expect(() =>
      render(Containers.ScrollView, { children: null, axes: 'diagonal' })
    ).toThrow('Swift.ScrollView axes must be one of vertical, horizontal, both')
  })

  it('marks its children as inside a container', () => {
    expect(
      render(Containers.ScrollView, { children: null }).props.children.props.value
    ).toBe(true)
  })
})

describe('lazy stacks', () => {
  it('centers by default and takes the alignment they are given', () => {
    expect(render(Containers.LazyVStack, { children: null })).toMatchObject({
      type: { __component: 'OneNativeLazyVStack' },
      props: { alignment: 'center' },
    })
    expect(
      render(Containers.LazyVStack, { children: null, alignment: 'trailing' }).props
        .alignment
    ).toBe('trailing')
    expect(render(Containers.LazyHStack, { children: null })).toMatchObject({
      type: { __component: 'OneNativeLazyHStack' },
      props: { alignment: 'center' },
    })
    expect(
      render(Containers.LazyHStack, { children: null, alignment: 'bottom' }).props
        .alignment
    ).toBe('bottom')
  })

  it('rejects an alignment it cannot map', () => {
    expect(() =>
      render(Containers.LazyVStack, { children: null, alignment: 'middle' })
    ).toThrow('Swift.LazyVStack alignment must be one of leading, center, trailing')
    expect(() =>
      render(Containers.LazyHStack, { children: null, alignment: 'middle' })
    ).toThrow(
      'Swift.LazyHStack alignment must be one of top, center, bottom, firstTextBaseline, lastTextBaseline'
    )
  })

  it('sends -1 for omitted spacing and passes spacing it is given', () => {
    expect(render(Containers.LazyVStack, { children: null }).props.spacing).toBe(
      -1
    )
    expect(
      render(Containers.LazyVStack, { children: null, spacing: 12 }).props.spacing
    ).toBe(12)
    expect(render(Containers.LazyHStack, { children: null }).props.spacing).toBe(
      -1
    )
    expect(
      render(Containers.LazyHStack, { children: null, spacing: 8 }).props.spacing
    ).toBe(8)
  })

  it('rejects spacing that is not a non-negative number', () => {
    for (const value of [Number.NaN, -1]) {
      expect(() =>
        render(Containers.LazyVStack, { children: null, spacing: value })
      ).toThrow('Swift.LazyVStack spacing must be a non-negative number')
      expect(() =>
        render(Containers.LazyHStack, { children: null, spacing: value })
      ).toThrow('Swift.LazyHStack spacing must be a non-negative number')
    }
  })
})

describe('fill viewport defaults', () => {
  it('fills height by default and yields to an explicit style', () => {
    const style = { height: 150 }
    for (const C of [Containers.List, Containers.ScrollView]) {
      const fallback = render(C, { children: null }).props.style
      expect(fallback[0]).toEqual({ flex: 1, alignSelf: 'stretch' })
      const explicit = render(C, { children: null, style }).props.style
      expect(explicit[0]).toEqual({ alignSelf: 'stretch' })
      expect(explicit[1]).toBe(style)
    }
  })

  it('fills the remaining height beside siblings without overriding explicit height', () => {
    const layout = (style: Record<string, unknown>) => {
      const root = Yoga.Node.create()
      root.setWidth(300)
      root.setHeight(600)
      root.setFlexDirection(Yoga.FLEX_DIRECTION_COLUMN)
      root.setGap(Yoga.GUTTER_ALL, 10)
      const header = Yoga.Node.create()
      header.setHeight(100)
      const node = Yoga.Node.create()
      if (style.flex === 1) node.setFlex(1)
      if (typeof style.height === 'number') node.setHeight(style.height)
      root.insertChild(header, 0)
      root.insertChild(node, 1)
      root.calculateLayout(300, 600, Yoga.DIRECTION_LTR)
      const computed = node.getComputedHeight()
      root.freeRecursive()
      return computed
    }
    const fallback = render(Containers.List, { children: null }).props.style[0]
    const explicit = render(Containers.List, {
      children: null,
      style: { height: 150 },
    }).props.style
    expect(layout(fallback)).toBe(490)
    expect(layout({ ...explicit[0], ...explicit[1] })).toBe(150)
  })
})

describe('greedy containers', () => {
  // a list and a scroll view take the box they are given instead of reporting an
  // ideal height, so a measured parent reads zero for one and renders nothing at all.
  it('rejects a list or scroll view inside a measured stack', () => {
    const list = createElement(Containers.List, { children: null })
    const scroll = createElement(Containers.ScrollView, { children: null })
    for (const [child, name] of [
      [list, 'Swift.List'],
      [scroll, 'Swift.ScrollView'],
    ] as const) {
      const host = render(Containers.HStack, { children: child })
      expect(() => host.type(host.props)).toThrow(
        `${name} cannot be a child of Swift.HStack`
      )
      expect(() => render(Containers.ZStack, { children: child })).toThrow(
        `${name} cannot be a child of Swift.ZStack`
      )
    }
  })
})

// the published contract: props, the ListStyle enum binding, the composed-content
// slot, and the provider entries React Native's codegen mounts views through.
describe('list schema', () => {
  it('carries the four containers with their props and slots', () => {
    expect(component('List').props).toMatchObject({
      listStyle: { type: 'string', enum: 'ListStyle' },
    })
    expect(component('ScrollView').props).toMatchObject({
      axes: { type: 'string' },
      showsIndicators: { type: 'boolean' },
    })
    expect(component('LazyVStack').props).toMatchObject({
      alignment: { type: 'string' },
    })
    expect(component('LazyHStack').props).toMatchObject({
      alignment: { type: 'string' },
    })
    for (const name of ['List', 'ScrollView', 'LazyVStack', 'LazyHStack']) {
      expect(component(name).layout).toMatchObject({ kind: 'container' })
      expect(component(name).slots).toMatchObject([
        { name: 'content', content: 'one-native', cardinality: 'many' },
      ])
      expect(component(name).interfaceOnly).toBe(false)
    }
  })

  it('registers a component view for every new container', () => {
    for (const name of [
      'OneNativeList',
      'OneNativeScrollView',
      'OneNativeLazyVStack',
      'OneNativeLazyHStack',
    ])
      expect(metadata.codegenConfig.ios.componentProvider[name]).toBe(
        `${name}ComponentView`
      )
  })

  it('binds the six list styles Expo documents', () => {
    expect(Object.keys(swiftUIValues.ListStyle).sort()).toEqual(
      ['automatic', 'grouped', 'inset', 'insetGrouped', 'plain', 'sidebar'].sort()
    )
  })
})

describe('list native mapping', () => {
  // a value with no Swift case falls through to a precondition failure in a debug
  // build, so the TypeScript unions and the switches must list the same values.
  it('maps every axes and alignment value the props accept', () => {
    const scroll = read('ios/OneNativeScrollViewView.swift')
    for (const axes of scrollViewAxes)
      expect(scroll.includes(`case "${axes}":`), axes).toBe(true)
    const vstack = read('ios/OneNativeLazyVStackView.swift')
    for (const alignment of lazyVStackAlignments)
      expect(vstack.includes(`case "${alignment}":`), alignment).toBe(true)
    const hstack = read('ios/OneNativeLazyHStackView.swift')
    for (const alignment of lazyHStackAlignments)
      expect(hstack.includes(`case "${alignment}":`), alignment).toBe(true)
  })
})

describe('list unsupported surface', () => {
  it('throws for every new container without the native build', () => {
    for (const name of ['List', 'ScrollView', 'LazyVStack', 'LazyHStack'])
      expect(
        () => (UnsupportedSwift as Record<string, (props: object) => unknown>)[name]({}),
        name
      ).toThrow(`Swift.${name} requires an iOS native build`)
  })
})
