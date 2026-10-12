import { createElement, useEffect } from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create } from 'react-test-renderer'
import { Swift as UnsupportedSwift } from '../src/platform/unsupported'
import type { ScrollViewProxy } from '../src/platform/listTypes'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// stubs are class components that mount their children, so the reader's ref resolves
// to a mounted host and content effects run; codegen commands are recorded where
// Fabric would dispatch them to native.
const commands = vi.hoisted(() => [] as { name: string; args: unknown[] }[])
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  StyleSheet: { flatten: (style: unknown) => style },
  View: () => null,
  Text: () => null,
  Image: () => null,
  ScrollView: () => null,
  TextInput: () => null,
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', async () => {
  const { Component } = await import('react')
  type ReactNode = import('react').ReactNode
  return {
    default: (name: string) =>
      class Stub extends Component<{ children?: ReactNode }> {
        static displayName = name
        render() {
          return this.props.children ?? null
        }
      },
  }
})
vi.mock('react-native/Libraries/Utilities/codegenNativeCommands', () => ({
  default: ({ supportedCommands }: { supportedCommands: string[] }) =>
    Object.fromEntries(
      supportedCommands.map((name) => [
        name,
        (...args: unknown[]) => commands.push({ name, args }),
      ])
    ),
}))

let Containers: typeof import('../src/platform/Containers.native')

beforeAll(async () => {
  Containers = await import('../src/platform/Containers.native')
})

beforeEach(() => {
  commands.length = 0
})

const root = fileURLToPath(new URL('..', import.meta.url))
const schema = JSON.parse(readFileSync(root + 'schema.json', 'utf8'))
const metadata = JSON.parse(readFileSync(root + 'package.json', 'utf8'))
const component = (publicName: string) =>
  schema.components.find(
    (entry: { publicName: string }) => entry.publicName === publicName
  )

const group = () => createElement(Containers.Group, { children: null })

function renderReader(children: unknown) {
  let rendered: ReturnType<typeof create> | undefined
  act(() => {
    rendered = create(
      createElement(Containers.ScrollViewReader, null, children as never) as never
    )
  })
  return rendered!
}

function nativeOf(rendered: ReturnType<typeof create>) {
  return rendered.root.find(
    (node) =>
      (node.type as { displayName?: string })?.displayName === 'OneNativeScrollViewReader'
  )
}

function mountedProxy() {
  let proxy: ScrollViewProxy | undefined
  const rendered = renderReader((value: ScrollViewProxy) => {
    proxy = value
    return group()
  })
  return { rendered, proxy: proxy! }
}

describe('scroll view reader', () => {
  it('runs the content builder with a proxy and composes what it returns', () => {
    const { rendered, proxy } = mountedProxy()
    expect(typeof proxy.scrollTo).toBe('function')
    const native = nativeOf(rendered)
    expect(native.props.children.props.value).toBe(true)
    expect(native.props.children.props.children.type).toBe(Containers.Group)
  })

  it('keeps one proxy across rebuilds', () => {
    const seen: ScrollViewProxy[] = []
    const builder = (proxy: ScrollViewProxy) => {
      seen.push(proxy)
      return group()
    }
    const rendered = renderReader(builder)
    act(() => {
      rendered.update(
        createElement(Containers.ScrollViewReader, null, builder as never) as never
      )
    })
    expect(seen).toHaveLength(2)
    expect(seen[1]).toBe(seen[0])
  })

  it('sends scrollTo to the mounted native reader with a nil anchor', () => {
    const { rendered, proxy } = mountedProxy()
    proxy.scrollTo('row-29')
    proxy.scrollTo('row-29', null)
    const host = nativeOf(rendered).instance
    expect(commands).toEqual([
      { name: 'scrollTo', args: [host, 'row-29', false, 0, 0] },
      { name: 'scrollTo', args: [host, 'row-29', false, 0, 0] },
    ])
  })

  it('resolves named UnitPoint anchors to their SDK coordinates', () => {
    const { proxy } = mountedProxy()
    proxy.scrollTo('a', 'bottom')
    proxy.scrollTo('a', 'top')
    proxy.scrollTo('a', 'zero')
    proxy.scrollTo('a', 'bottomTrailing')
    proxy.scrollTo('a', { x: 0.25, y: 0.75 })
    expect(commands.map(({ args }) => args.slice(2))).toEqual([
      [true, 0.5, 1],
      [true, 0.5, 0],
      [true, 0, 0],
      [true, 1, 1],
      [true, 0.25, 0.75],
    ])
  })

  it('passes an id no view carries through to native, where SwiftUI ignores it', () => {
    const { proxy } = mountedProxy()
    proxy.scrollTo('missing', 'center')
    expect(commands).toHaveLength(1)
    expect(commands[0].args.slice(1)).toEqual(['missing', true, 0.5, 0.5])
  })

  it('runs scrollTo from a content effect after the reader mounts', () => {
    function Jump({ proxy }: { proxy: ScrollViewProxy }) {
      useEffect(() => proxy.scrollTo('row-3', 'top'), [proxy])
      return null
    }
    renderReader((proxy: ScrollViewProxy) => createElement(Jump, { proxy }))
    expect(commands.map(({ args }) => args.slice(1))).toEqual([['row-3', true, 0.5, 0]])
  })

  it('throws when scrollTo runs while the builder builds', () => {
    expect(() =>
      renderReader((proxy: ScrollViewProxy) => {
        proxy.scrollTo('row-0')
        return group()
      })
    ).toThrow('cannot run while Swift.ScrollViewReader builds its content')
    expect(commands).toEqual([])
  })

  it('throws for invalid ids and anchors instead of sending them', () => {
    const { proxy } = mountedProxy()
    expect(() => proxy.scrollTo(29 as never)).toThrow('id must be a string')
    expect(() => proxy.scrollTo('a', 'middle' as never)).toThrow(
      'anchor must be a UnitPoint'
    )
    expect(() => proxy.scrollTo('a', 'toString' as never)).toThrow(
      'anchor must be a UnitPoint'
    )
    expect(() => proxy.scrollTo('a', { x: Number.NaN, y: 0 })).toThrow(
      'must be finite numbers'
    )
    expect(() => proxy.scrollTo('a', 5 as never)).toThrow('must be finite numbers')
    expect(commands).toEqual([])
  })

  it('throws instead of dropping a scrollTo after the reader unmounts', () => {
    const { rendered, proxy } = mountedProxy()
    act(() => rendered.unmount())
    expect(() => proxy.scrollTo('row-0')).toThrow(
      'needs its Swift.ScrollViewReader mounted'
    )
    expect(commands).toEqual([])
  })

  it('rejects static children and React Native content', async () => {
    for (const children of [group(), 'rows', undefined])
      expect(() => renderReader(children)).toThrow(
        'Swift.ScrollViewReader takes a render function of its proxy'
      )
    const { View } = (await import('react-native')) as never as { View: () => null }
    expect(() => renderReader(() => createElement(View))).toThrow(
      'takes SwiftUI children'
    )
  })

  it('throws without the native build', () => {
    expect(() =>
      (UnsupportedSwift as Record<string, (props: object) => unknown>).ScrollViewReader(
        {}
      )
    ).toThrow('Swift.ScrollViewReader requires an iOS native build')
  })
})

describe('scroll view reader schema', () => {
  it('carries the reader slot and its private scrollTo command', () => {
    const reader = component('ScrollViewReader')
    expect(reader.name).toBe('OneNativeScrollViewReader')
    expect(reader.props).toEqual({})
    expect(reader.events).toEqual({})
    expect(reader.commands).toEqual({
      scrollTo: {
        scrollID: { type: 'string' },
        hasAnchor: { type: 'boolean' },
        anchorX: { type: 'Double' },
        anchorY: { type: 'Double' },
      },
    })
    expect(reader.layout).toEqual({ kind: 'container' })
    expect(reader.slots).toMatchObject([{ name: 'content', content: 'one-native' }])
    expect(reader.interfaceOnly).toBe(false)
    expect(metadata.codegenConfig.ios.componentProvider.OneNativeScrollViewReader).toBe(
      'OneNativeScrollViewReaderComponentView'
    )
  })
})
