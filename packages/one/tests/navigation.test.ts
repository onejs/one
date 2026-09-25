import { createElement, type ReactNode } from 'react'
import { Platform } from 'react-native'
import TestRenderer from 'react-test-renderer'
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  StyleSheet: {
    flatten: function flatten(
      style: unknown,
      into: Record<string, unknown> = {}
    ): Record<string, unknown> {
      if (Array.isArray(style)) style.forEach((entry) => flatten(entry, into))
      else if (style && typeof style === 'object') Object.assign(into, style)
      return into
    } as (style: unknown) => Record<string, unknown>,
  },
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  ScrollView: 'ScrollView',
  TextInput: 'TextInput',
  processColor: (value: unknown) => value,
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => `host-${name}`,
}))
vi.mock('react-native/Libraries/Types/CodegenTypes', () => ({}))

let Navigation: typeof import('../src/platform/NavigationStack.native')
let Containers: typeof import('../src/platform/Containers.native')

beforeAll(async () => {
  Containers = await import('../src/platform/Containers.native')
  Navigation = await import('../src/platform/NavigationStack.native')
})

const render = (element: ReactNode) => {
  let tree: TestRenderer.ReactTestRenderer | undefined
  TestRenderer.act(() => {
    tree = TestRenderer.create(element as never)
  })
  return tree!
}

const slot = () => createElement(Containers.Slot, { height: 44, children: 'row' })

const button = () => createElement(Containers.Button, { label: 'Save' })

const stack = (children: ReactNode, props: object = {}) =>
  createElement(Navigation.NavigationStack, { ...props, children })

const toolbar = (children: ReactNode) => createElement(Navigation.Toolbar, { children })

const item = (placement: string | undefined, child: ReactNode) =>
  createElement(Navigation.ToolbarItem, { placement, children: child })

const host = (name: string) => name as never

describe('Swift.NavigationStack', () => {
  it('hosts React Native content and a toolbar in one native stack', () => {
    const tree = render(
      stack([
        createElement('View', { key: 'page' }, 'page'),
        toolbar(item('principal', button())),
      ])
    )
    expect(tree.root.findAllByType(host('host-OneNativeToolbar')).length).toBe(1)
    expect(
      tree.root.findAllByType(host('host-OneNativeNavigationStackContent')).length
    ).toBe(1)
    const toolbarNode = tree.root.findByType(host('host-OneNativeToolbar'))
    expect(toolbarNode.findAllByType(host('host-OneNativeToolbarItem')).length).toBe(1)
    const itemNode = tree.root.findByType(host('host-OneNativeToolbarItem'))
    expect(itemNode.props.placement).toBe('principal')
    const contentNode = tree.root.findByType(host('host-OneNativeNavigationStackContent'))
    expect(contentNode.findAllByType('View' as never).length).toBe(1)
    tree.unmount()
  })

  it('rejects a toolbar item written directly under the stack', () => {
    expect(() => render(stack(item('principal', button())))).toThrow(
      'Swift.NavigationStack accepts Swift.Toolbar elements or React Native content'
    )
  })

  it('renders with no toolbar at all', () => {
    const tree = render(stack(createElement('View', {})))
    expect(tree.root.findAllByType(host('host-OneNativeToolbar')).length).toBe(0)
    expect(
      tree.root.findAllByType(host('host-OneNativeNavigationStackContent')).length
    ).toBe(1)
    tree.unmount()
  })

  it('cannot be a child of a measured host', () => {
    expect(() =>
      render(
        createElement(Containers.Host, {
          children: stack(createElement('View', {})),
        })
      )
    ).toThrow('Swift.NavigationStack cannot be a child of Swift.Host')
  })
})

describe('Swift.Toolbar markers', () => {
  it('throws where a marker is written instead of read by its parent', () => {
    expect(() => render(createElement(Navigation.Toolbar, { children: 'x' }))).toThrow(
      'Swift.Toolbar must be a direct child of Swift.NavigationStack'
    )
    expect(() =>
      render(createElement(Navigation.ToolbarItem, { children: 'x' }))
    ).toThrow('Swift.ToolbarItem must be a direct child of Swift.Toolbar')
    expect(() =>
      render(createElement(Navigation.ToolbarItemGroup, { children: 'x' }))
    ).toThrow('Swift.ToolbarItemGroup must be a direct child of Swift.Toolbar')
    expect(() => render(createElement(Navigation.ToolbarSpacer, {}))).toThrow(
      'Swift.ToolbarSpacer must be a direct child of Swift.Toolbar'
    )
  })

  it('rejects every placement the SDK does not declare', () => {
    expect(() => render(stack(toolbar(item('middle', button()))))).toThrow(
      'Unknown SwiftUI ToolbarItemPlacement: middle'
    )
  })

  it('accepts every placement the SDK declares on this runtime', () => {
    const tree = render(
      stack(
        toolbar([
          item('topBarTrailing', button()),
          item('largeTitle', button()),
          item('navigationBarTrailing', button()),
        ])
      )
    )
    const placements = tree.root
      .findAllByType(host('host-OneNativeToolbarItem'))
      .map((node) => node.props.placement)
    expect(placements).toEqual(['topBarTrailing', 'largeTitle', 'navigationBarTrailing'])
    tree.unmount()
  })

  it('gates a placement the runtime is too old for', () => {
    const version = Platform.Version
    Platform.Version = '26.0'
    try {
      expect(() =>
        render(stack(toolbar(item('topBarPinnedTrailing', button()))))
      ).toThrow('ToolbarItemPlacement.topBarPinnedTrailing requires iOS 27')
    } finally {
      Platform.Version = version
    }
  })

  it('carries a labelled group through the labelled group initializer', () => {
    const tree = render(
      stack(
        toolbar(
          createElement(Navigation.ToolbarItemGroup, {
            placement: 'primaryAction',
            label: 'Sort',
            systemImage: 'arrow.up.arrow.down',
            children: button(),
          })
        )
      )
    )
    const group = tree.root.findByType(host('host-OneNativeToolbarItemGroup'))
    expect(group.props).toMatchObject({
      placement: 'primaryAction',
      label: 'Sort',
      systemImage: 'arrow.up.arrow.down',
    })
    tree.unmount()
  })

  it('requires a group label before a group symbol', () => {
    expect(() =>
      render(
        stack(
          toolbar(
            createElement(Navigation.ToolbarItemGroup, {
              systemImage: 'arrow.up',
              children: button(),
            })
          )
        )
      )
    ).toThrow('Swift.ToolbarItemGroup systemImage requires a label')
  })

  it('takes a spacer with a sizing and no children', () => {
    const tree = render(
      stack(toolbar(createElement(Navigation.ToolbarSpacer, { sizing: 'fixed' })))
    )
    const spacer = tree.root.findByType(host('host-OneNativeToolbarSpacer'))
    expect(spacer.props.sizing).toBe('fixed')
    expect(spacer.props.placement).toBe('automatic')
    tree.unmount()

    expect(() =>
      render(
        stack(
          toolbar(
            createElement(Navigation.ToolbarSpacer, {
              sizing: 'fixed',
              children: button(),
            })
          )
        )
      )
    ).toThrow('Swift.ToolbarSpacer takes no children')
  })

  it('rejects a spacer before iOS 26', () => {
    const version = Platform.Version
    Platform.Version = '25.0'
    try {
      expect(() =>
        render(stack(toolbar(createElement(Navigation.ToolbarSpacer, {}))))
      ).toThrow('Swift.ToolbarSpacer requires iOS 26 or later')
    } finally {
      Platform.Version = version
    }
  })

  it('needs children in an item and rejects React Native children', () => {
    expect(() => render(stack(toolbar(item('principal', undefined))))).toThrow(
      'Swift.ToolbarItem needs children'
    )
    expect(() =>
      render(stack(toolbar(item('principal', createElement('View', {})))))
    ).toThrow(
      'Swift.ToolbarItem takes SwiftUI children; move React Native content into Swift.Slot'
    )
  })

  it('takes a Swift.Slot in a toolbar item', () => {
    const tree = render(stack(toolbar(item('principal', slot()))))
    const itemNode = tree.root.findByType(host('host-OneNativeToolbarItem'))
    expect(itemNode.findAllByType('host-OneNativeContainerSlot').length).toBe(1)
    tree.unmount()
  })

  it('rejects nested content types a toolbar cannot hold', () => {
    expect(() => render(stack(toolbar(createElement('View', {}))))).toThrow(
      'Swift.Toolbar accepts Swift.ToolbarItem, Swift.ToolbarItemGroup, and Swift.ToolbarSpacer elements as children'
    )
  })

  it('accepts an empty toolbar the way an empty .toolbar does', () => {
    const tree = render(stack(toolbar([])))
    const toolbarNode = tree.root.findByType(host('host-OneNativeToolbar'))
    expect(toolbarNode.findAllByType(host('host-OneNativeToolbarItem')).length).toBe(0)
    tree.unmount()
  })
})
