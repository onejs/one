import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Swift as UnsupportedSwift } from '../src/platform/unsupported'

// same render-element setup as groups.test.ts. the reader reads no hooks, so
// calling it directly is safe; what is asserted is its contract surface below.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  View: () => null,
  Text: () => null,
  Image: () => null,
  ScrollView: () => null,
  TextInput: () => null,
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

let Containers: typeof import('../src/platform/Containers.native')

beforeAll(async () => {
  Containers = await import('../src/platform/Containers.native')
})

const render = (component: (props: never) => any, props: object): any =>
  component(props as never)

const root = fileURLToPath(new URL('..', import.meta.url))
const schema = JSON.parse(readFileSync(root + 'schema.json', 'utf8'))
const metadata = JSON.parse(readFileSync(root + 'package.json', 'utf8'))
const component = (publicName: string) =>
  schema.components.find(
    (entry: { publicName: string }) => entry.publicName === publicName
  )

describe('geometry reader', () => {
  it('composes children natively and marks them inside a container', () => {
    const child = createElement(Containers.Group, { children: null })
    const element = render(Containers.GeometryReader, { children: child })
    expect(element).toMatchObject({ type: { __component: 'OneNativeGeometryReader' } })
    expect(element.props.children.props.value).toBe(true)
  })

  it('forwards the native frame to onGeometryChange', () => {
    const seen: unknown[] = []
    const element = render(Containers.GeometryReader, {
      children: null,
      onGeometryChange: (frame: unknown) => seen.push(frame),
    })
    element.props.onNativeGeometryReaderChange({
      nativeEvent: { x: 8, y: 44, width: 200, height: 100 },
    })
    expect(seen).toEqual([{ x: 8, y: 44, width: 200, height: 100 }])
  })

  it('stays silent without a subscriber', () => {
    const element = render(Containers.GeometryReader, { children: null })
    expect(() =>
      element.props.onNativeGeometryReaderChange({
        nativeEvent: { x: 0, y: 0, width: 10, height: 10 },
      })
    ).not.toThrow()
  })

  it('rejects a non-function subscriber and an invalid native geometry', () => {
    expect(() =>
      render(Containers.GeometryReader, { children: null, onGeometryChange: 'soon' })
    ).toThrow('Swift.GeometryReader onGeometryChange must be a function')
    const element = render(Containers.GeometryReader, {
      children: null,
      onGeometryChange: () => {},
    })
    for (const nativeEvent of [
      null,
      { x: 0, y: 0, width: 10 },
      { x: 0, y: 0, width: Number.NaN, height: 10 },
      { x: 0, y: 0, width: 10, height: Number.POSITIVE_INFINITY },
    ])
      expect(() => element.props.onNativeGeometryReaderChange({ nativeEvent })).toThrow(
        'Swift.GeometryReader emitted an invalid geometry'
      )
  })

  it('rejects render functions, raw text, and React Native children', async () => {
    expect(() =>
      render(Containers.GeometryReader, {
        children: ((frame: unknown) => null) as never,
      })
    ).toThrow('Swift.GeometryReader takes SwiftUI children, not a render function')
    expect(() => render(Containers.GeometryReader, { children: 'sized' })).toThrow(
      'not raw text'
    )
    const { View } = (await import('react-native')) as never as {
      View: () => null
    }
    expect(() =>
      render(Containers.GeometryReader, { children: createElement(View) })
    ).toThrow('takes SwiftUI children')
  })

  it('throws without the native build', () => {
    expect(
      () =>
        (UnsupportedSwift as Record<string, (props: object) => unknown>).GeometryReader({}),
    ).toThrow('Swift.GeometryReader requires an iOS native build')
  })
})

describe('geometry reader schema', () => {
  it('carries the reader contract with its geometry event and slot', () => {
    expect(component('GeometryReader').props).toMatchObject({})
    expect(component('GeometryReader').events).toMatchObject({
      onNativeGeometryReaderChange: {
        x: { type: 'Double' },
        y: { type: 'Double' },
        width: { type: 'Double' },
        height: { type: 'Double' },
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
