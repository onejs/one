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

type Person = { id: string | number; name: string; age: number }

const people: Person[] = [
  { id: 'ada', name: 'Ada', age: 36 },
  { id: 'bo', name: 'Bo', age: 29 },
]
const columns = [
  { id: 'name', title: 'Name' },
  { id: 'age', title: 'Age' },
]

const cell = (key: string) => createElement(Containers.Group, { children: null, key })

function renderTable(props: Record<string, unknown>) {
  let rendered: ReturnType<typeof create> | undefined
  act(() => {
    rendered = create(createElement(Containers.Table, props as never) as never)
  })
  return rendered!
}

const table = (rendered: ReturnType<typeof create>) => stubOf(rendered, 'OneNativeTable')
const base = { data: people, columns, children: (p: Person, c: { id: string }) => cell(`${p.id}${c.id}`) }

describe('table', () => {
  it('sends rows and columns to native and mounts one cell per row and column in row order', () => {
    const seen: string[] = []
    const rendered = renderTable({
      ...base,
      children: (p: Person, c: { id: string }) => {
        seen.push(`${p.id}:${c.id}`)
        return cell('x')
      },
    })
    expect(seen).toEqual(['ada:name', 'ada:age', 'bo:name', 'bo:age'])
    const native = table(rendered)
    expect(JSON.parse(native.props.rows)).toEqual([{ id: 'ada' }, { id: 'bo' }])
    expect(JSON.parse(native.props.columns)).toEqual(columns)
    expect(native.props.sortable).toBe(false)
    expect(native.props.sort).toBe('')
    const cells = native.props.children as { props: { rowId: string; columnId: string } }[]
    expect(cells.map((c) => [c.props.rowId, c.props.columnId])).toEqual([
      ['ada', 'name'],
      ['ada', 'age'],
      ['bo', 'name'],
      ['bo', 'age'],
    ])
  })

  it('is sortable with onSortChange and sends the sorted column', () => {
    const rendered = renderTable({
      ...base,
      sort: { column: 'age', direction: 'descending' },
      onSortChange: () => {},
    })
    expect(table(rendered).props.sortable).toBe(true)
    expect(JSON.parse(table(rendered).props.sort)).toEqual({ column: 'age', ascending: false })
    const none = renderTable({ ...base, sort: null, onSortChange: () => {} })
    expect(table(none).props.sort).toBe('')
  })

  it('reports a header tap as a sort change and ignores a stale event', () => {
    const changes: unknown[] = []
    const rendered = renderTable({
      ...base,
      sort: null,
      onSortChange: (sort: unknown) => changes.push(sort),
    })
    const event = (sort: object, eventCount: number) => ({
      nativeEvent: { sort: JSON.stringify(sort), eventCount, revision: 0 },
    })
    act(() => {
      table(rendered).props.onNativeTableSortChange(event({ column: 'name', ascending: true }, 1))
    })
    act(() => {
      table(rendered).props.onNativeTableSortChange(event({ column: 'name', ascending: true }, 1))
    })
    act(() => {
      table(rendered).props.onNativeTableSortChange(event({ column: 'name', ascending: false }, 2))
    })
    expect(changes).toEqual([
      { column: 'name', direction: 'ascending' },
      { column: 'name', direction: 'descending' },
    ])
    expect(table(rendered).props.acknowledgedEvent).toBe(2)
  })

  it('reads ids from idKey and stringifies numbers', () => {
    const rendered = renderTable({ ...base, data: [{ key: 7 }], idKey: 'key' })
    expect(JSON.parse(table(rendered).props.rows)).toEqual([{ id: '7' }])
  })

  it('rejects bad rows, columns and sort', () => {
    expect(() => renderTable({ ...base, data: [{ id: 'x' }, { id: 'x' }] })).toThrow('item id x appears twice')
    expect(() => renderTable({ ...base, data: [{ id: {} }] })).toThrow('ids must be strings or numbers')
    expect(() => renderTable({ ...base, columns: [] })).toThrow('non-empty array')
    expect(() => renderTable({ ...base, columns: [{ id: 'a', title: 'A' }, { id: 'a', title: 'B' }] })).toThrow(
      'column id a appears twice'
    )
    expect(() => renderTable({ ...base, columns: [{ id: 'a', title: '' }] })).toThrow('needs a non-empty title')
    expect(() => renderTable({ ...base, onSortChange: () => {} })).toThrow('needs sort')
    expect(() => renderTable({ ...base, sort: null })).toThrow('needs onSortChange')
    expect(() =>
      renderTable({ ...base, sort: { column: 'nope', direction: 'ascending' }, onSortChange: () => {} })
    ).toThrow('is not one of its columns')
    expect(() =>
      renderTable({ ...base, sort: { column: 'name', direction: 'up' }, onSortChange: () => {} })
    ).toThrow('direction must be one of')
  })

  it('rejects a missing render function and data', () => {
    expect(() => renderTable({ ...base, children: cell('x') })).toThrow('takes a render function')
    expect(() => renderTable({ ...base, data: 'no' })).toThrow('data must be an array')
  })

  it('rejects React Native content and raw text from the cell closure', async () => {
    const { View } = (await import('react-native')) as never as { View: () => null }
    expect(() => renderTable({ ...base, children: () => createElement(View) })).toThrow('takes SwiftUI children')
    expect(() => renderTable({ ...base, children: () => 'text' })).toThrow('not raw text')
  })

  it('throws without the native build', () => {
    expect(() => (UnsupportedSwift as Record<string, (props: object) => unknown>).Table({})).toThrow(
      'Swift.Table requires an iOS native build'
    )
  })
})

describe('table schema', () => {
  it('carries the transport props, controlled sort and keyed cell slot, and the cell its ids', () => {
    expect(component('Table').props).toMatchObject({
      rows: { type: 'string' },
      columns: { type: 'string' },
      sortable: { type: 'boolean' },
      sort: { type: 'string' },
    })
    expect(component('Table').controlled).toMatchObject({ value: 'sort', event: 'onNativeTableSortChange' })
    expect(component('Table').slots).toMatchObject([{ name: 'cells', content: 'OneNativeTableCell', key: 'rowId' }])
    expect(component('Table').interfaceOnly).toBe(false)
    const cell = schema.components.find((entry: { name: string }) => entry.name === 'OneNativeTableCell')
    expect(cell.props).toMatchObject({ rowId: { type: 'string' }, columnId: { type: 'string' } })
    expect(metadata.codegenConfig.ios.componentProvider.OneNativeTable).toBe('OneNativeTableComponentView')
    expect(metadata.codegenConfig.ios.componentProvider.OneNativeTableCell).toBe('OneNativeTableCellComponentView')
  })
})
