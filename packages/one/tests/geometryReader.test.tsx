import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, create } from 'react-test-renderer'
import { Swift as UnsupportedSwift } from '../src/platform/unsupported'
import type { GeometryProxySnapshot } from '../src/platform/groupTypes'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// same stub setup as mapControls.test.tsx. the reader reads hooks, so every
// case mounts through the renderer and drives the private native event the
// way the map suite drives its slot props.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  View: () => null,
  Text: () => null,
  Image: () => null,
  ScrollView: () => null,
  TextInput: () => null,
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => {
    const Stub = (_props: unknown) => null
    Stub.displayName = name
    return Stub
  },
}))

let Containers: typeof import('../src/platform/Containers.native')

beforeAll(async () => {
  Containers = await import('../src/platform/Containers.native')
})

const root = fileURLToPath(new URL('..', import.meta.url))
const schema = JSON.parse(readFileSync(root + 'schema.json', 'utf8'))
const metadata = JSON.parse(readFileSync(root + 'package.json', 'utf8'))
const component = (publicName: string) =>
  schema.components.find(
    (entry: { publicName: string }) => entry.publicName === publicName
  )

function stubOf(root: ReturnType<typeof create>, name: string) {
  return root.root.find(
    (node) => (node.type as { displayName?: string })?.displayName === name
  )
}

const zeroSnapshot: GeometryProxySnapshot = {
  size: { width: 0, height: 0 },
  safeAreaInsets: { top: 0, leading: 0, bottom: 0, trailing: 0 },
  frame: { x: 0, y: 0, width: 0, height: 0 },
}

const nativeReport = {
  x: 8,
  y: 44,
  width: 200,
  height: 100,
  safeAreaTop: 59,
  safeAreaLeading: 0,
  safeAreaBottom: 34,
  safeAreaTrailing: 0,
}

function renderReader(children: unknown) {
  let rendered: ReturnType<typeof create> | undefined
  act(() => {
    rendered = create(
      createElement(
        Containers.GeometryReader,
        null,
        children as never
      ) as never
    )
  })
  return rendered!
}

function fireGeometry(rendered: ReturnType<typeof create>, nativeEvent: unknown) {
  act(() => {
    stubOf(rendered, 'OneNativeGeometryReader').props.onNativeGeometryReaderChange({
      nativeEvent,
    })
  })
}

describe('geometry reader', () => {
  it('runs its content closure with the zero snapshot on first paint', () => {
    const seen: GeometryProxySnapshot[] = []
    const rendered = renderReader((geometry: GeometryProxySnapshot) => {
      seen.push(geometry)
      return createElement(Containers.Group, { children: null })
    })
    expect(seen).toEqual([zeroSnapshot])
    // stubs render null, so composition is asserted on the native element the
    // way the map suite asserts its slot props: inside the container, a group.
    const native = stubOf(rendered, 'OneNativeGeometryReader')
    expect(native.props.children.props.value).toBe(true)
    expect(native.props.children.props.children.type).toBe(Containers.Group)
  })

  it('re-runs content with the native snapshot when geometry reports', () => {
    const seen: GeometryProxySnapshot[] = []
    const rendered = renderReader((geometry: GeometryProxySnapshot) => {
      seen.push(geometry)
      return createElement(Containers.Group, { children: null })
    })
    fireGeometry(rendered, nativeReport)
    expect(seen).toEqual([
      zeroSnapshot,
      {
        size: { width: 200, height: 100 },
        safeAreaInsets: { top: 59, leading: 0, bottom: 34, trailing: 0 },
        frame: { x: 8, y: 44, width: 200, height: 100 },
      },
    ])
    const native = stubOf(rendered, 'OneNativeGeometryReader')
    expect(native.props.children.props.children.type).toBe(Containers.Group)
  })

  it('keeps state on a duplicate native report', () => {
    const seen: GeometryProxySnapshot[] = []
    const rendered = renderReader((geometry: GeometryProxySnapshot) => {
      seen.push(geometry)
      return createElement(Containers.Group, { children: null })
    })
    fireGeometry(rendered, nativeReport)
    fireGeometry(rendered, nativeReport)
    expect(seen).toHaveLength(2)
  })

  it('rejects an invalid native geometry', () => {
    const rendered = renderReader(() => createElement(Containers.Group, { children: null }))
    for (const nativeEvent of [
      null,
      { ...nativeReport, width: Number.NaN },
      { ...nativeReport, safeAreaTop: Number.POSITIVE_INFINITY },
      { x: 0, y: 0, width: 10, height: 10 },
    ])
      expect(() => fireGeometry(rendered, nativeEvent)).toThrow(
        'Swift.GeometryReader emitted an invalid geometry'
      )
  })

  it('rejects static children, raw text, and a missing render function', () => {
    for (const children of [
      createElement(Containers.Group, { children: null }),
      'sized',
      undefined,
    ])
      expect(() => renderReader(children)).toThrow(
        'Swift.GeometryReader takes a render function of its geometry'
      )
  })

  it('rejects React Native content and raw text returned from the closure', async () => {
    const { View } = (await import('react-native')) as never as {
      View: () => null
    }
    expect(() =>
      renderReader(() => createElement(View))
    ).toThrow('takes SwiftUI children')
    expect(() => renderReader(() => 'sized')).toThrow('not raw text')
  })

  it('throws without the native build', () => {
    expect(
      () =>
        (UnsupportedSwift as Record<string, (props: object) => unknown>).GeometryReader({}),
    ).toThrow('Swift.GeometryReader requires an iOS native build')
  })
})

describe('geometry reader schema', () => {
  it('carries the reader contract with its private geometry event and slot', () => {
    expect(component('GeometryReader').props).toMatchObject({})
    expect(component('GeometryReader').events).toMatchObject({
      onNativeGeometryReaderChange: {
        x: { type: 'Double' },
        y: { type: 'Double' },
        width: { type: 'Double' },
        height: { type: 'Double' },
        safeAreaTop: { type: 'Double' },
        safeAreaLeading: { type: 'Double' },
        safeAreaBottom: { type: 'Double' },
        safeAreaTrailing: { type: 'Double' },
      },
    })
    expect(component('GeometryReader').layout).toMatchObject({ kind: 'container' })
    expect(component('GeometryReader').slots).toMatchObject([
      { name: 'content', content: 'one-native' },
    ])
    expect(component('GeometryReader').interfaceOnly).toBe(false)
    expect(metadata.codegenConfig.ios.componentProvider.OneNativeGeometryReader).toBe(
      'OneNativeGeometryReaderComponentView'
    )
  })
})
