import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, create } from 'react-test-renderer'
import { Swift as UnsupportedSwift } from '../src/platform/unsupported'

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

type Item = { id: string | number; name: string; kids?: Item[] | null }

const tree: Item[] = [
  { id: 'a', name: 'A', kids: [{ id: 'a1', name: 'A1' }, { id: 'a2', name: 'A2', kids: [] }] },
  { id: 'b', name: 'B' },
]

const group = (name: string) => createElement(Containers.Group, { children: null, key: name })

function renderOutline(props: Record<string, unknown>) {
  let rendered: ReturnType<typeof create> | undefined
  act(() => {
    rendered = create(createElement(Containers.OutlineGroup, props as never) as never)
  })
  return rendered!
}

const outline = (rendered: ReturnType<typeof create>) => stubOf(rendered, 'OneNativeOutlineGroup')

describe('outline group', () => {
  it('sends the tree shape to native and mounts one row per node in tree order', () => {
    const seen: string[] = []
    const rendered = renderOutline({
      data: tree,
      childrenKey: 'kids',
      children: (item: Item) => {
        seen.push(item.name)
        return group(item.name)
      },
    })
    expect(seen).toEqual(['A', 'A1', 'A2', 'B'])
    const native = outline(rendered)
    expect(JSON.parse(native.props.tree)).toEqual([
      {
        id: 'a',
        children: [
          { id: 'a1', children: null },
          { id: 'a2', children: [] },
        ],
      },
      { id: 'b', children: null },
    ])
    const rows = native.props.children as { key: string; props: { rowId: string; children: { props: { value: boolean } } } }[]
    expect(rows.map((row) => row.props.rowId)).toEqual(['a', 'a1', 'a2', 'b'])
    expect(rows.map((row) => row.key)).toEqual(['a', 'a1', 'a2', 'b'])
    expect(rows[0].props.children.props.value).toBe(true)
  })

  it('reads ids from idKey and stringifies numbers', () => {
    const rendered = renderOutline({
      data: [{ key: 7, kids: [{ key: 8 }] }],
      idKey: 'key',
      childrenKey: 'kids',
      children: () => group('row'),
    })
    expect(JSON.parse(outline(rendered).props.tree)).toEqual([
      { id: '7', children: [{ id: '8', children: null }] },
    ])
  })

  it('rejects a repeated id, a non-id value and a children value that is not an array', () => {
    const row = () => group('row')
    expect(() =>
      renderOutline({ data: [{ id: 'x' }, { id: 'y', kids: [{ id: 'x' }] }], childrenKey: 'kids', children: row })
    ).toThrow('item id x appears twice')
    expect(() => renderOutline({ data: [{ id: {} }], childrenKey: 'kids', children: row })).toThrow(
      'ids must be strings or numbers'
    )
    expect(() =>
      renderOutline({ data: [{ id: 'x', kids: 'no' }], childrenKey: 'kids', children: row })
    ).toThrow('must be an array of items or null')
  })

  it('rejects a missing render function, data and childrenKey', () => {
    expect(() => renderOutline({ data: tree, childrenKey: 'kids', children: group('x') })).toThrow(
      'takes a render function'
    )
    expect(() => renderOutline({ data: 'no', childrenKey: 'kids', children: () => null })).toThrow(
      'data must be an array'
    )
    expect(() => renderOutline({ data: tree, children: () => null })).toThrow('needs childrenKey')
  })

  it('rejects React Native content and raw text from the row closure', async () => {
    const { View } = (await import('react-native')) as never as { View: () => null }
    expect(() =>
      renderOutline({ data: tree, childrenKey: 'kids', children: () => createElement(View) })
    ).toThrow('takes SwiftUI children')
    expect(() => renderOutline({ data: tree, childrenKey: 'kids', children: () => 'text' })).toThrow(
      'not raw text'
    )
  })

  it('throws without the native build', () => {
    expect(
      () => (UnsupportedSwift as Record<string, (props: object) => unknown>).OutlineGroup({})
    ).toThrow('Swift.OutlineGroup requires an iOS native build')
  })
})

describe('outline group schema', () => {
  it('carries the tree prop and keyed row slot, and the row its id', () => {
    expect(component('OutlineGroup').props).toMatchObject({ tree: { type: 'string' } })
    expect(component('OutlineGroup').slots).toMatchObject([
      { name: 'rows', content: 'OneNativeOutlineRow', key: 'rowId' },
    ])
    expect(component('OutlineGroup').interfaceOnly).toBe(false)
    const row = schema.components.find((entry: { name: string }) => entry.name === 'OneNativeOutlineRow')
    expect(row.props).toMatchObject({ rowId: { type: 'string' } })
    expect(metadata.codegenConfig.ios.componentProvider.OneNativeOutlineGroup).toBe(
      'OneNativeOutlineGroupComponentView'
    )
    expect(metadata.codegenConfig.ios.componentProvider.OneNativeOutlineRow).toBe(
      'OneNativeOutlineRowComponentView'
    )
  })
})
