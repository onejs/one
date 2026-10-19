import { readFileSync } from 'node:fs'
import { Children } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, create } from 'react-test-renderer'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// the Menu adapter is a function over the spec modules, so a test drives the
// element it builds rather than mounting a native view. the spec modules
// collapse to named stubs and Platform pins iOS.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '27.0' },
  View: 'View',
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => {
    const Stub = (_props: unknown) => null
    Stub.displayName = name
    return Stub
  },
}))

let Menu: typeof import('../src/platform/Menu.native')

beforeAll(async () => {
  Menu = await import('../src/platform/Menu.native')
})

const schema = JSON.parse(readFileSync(new URL('../schema.json', import.meta.url), 'utf8'))
const component = (name: string) =>
  schema.components.find((entry: { name: string }) => entry.name === name)

function stubOf(root: ReturnType<typeof create>, name: string) {
  return root.root.find((node) => (node.type as { displayName?: string })?.displayName === name)
}

// the stubs render null, so the marker is read off the menu stub's children
// rather than the rendered tree.
function menuChildren(root: ReturnType<typeof create>) {
  return Children.toArray(stubOf(root, 'OneNativeMenu').props.children)
}

const items = [{ type: 'action', id: 'open', title: 'Open' }] as never

describe('context menu preview', () => {
  it('declares the preview slot and its box on the menu spec', () => {
    expect(component('OneNativeMenu').props).toMatchObject({
      previewWidth: { type: 'Double' },
      previewHeight: { type: 'Double' },
    })
    expect(component('OneNativeMenu').slots).toContainEqual({
      name: 'preview',
      content: 'OneNativeContextMenuPreview',
      cardinality: 'one',
      layout: 'presented',
    })
  })

  it('mounts the preview marker with its box', () => {
    let root: ReturnType<typeof create> | undefined
    act(() => {
      root = create(
        (
          <Menu.ContextMenu
            items={items}
            onAction={() => {}}
            preview={<></>}
            previewWidth={240}
            previewHeight={120}
          >
            <></>
          </Menu.ContextMenu>
        ) as never
      )
    })
    expect(stubOf(root!, 'OneNativeMenu').props).toMatchObject({
      previewWidth: 240,
      previewHeight: 120,
    })
    const kids = menuChildren(root!)
    expect(kids).toHaveLength(2)
    expect(
      ((kids[1] as { type?: { displayName?: string } }).type ?? {}).displayName
    ).toBe('OneNativeContextMenuPreview')
  })

  it('sends a zero box and no marker without a preview', () => {
    let root: ReturnType<typeof create> | undefined
    act(() => {
      root = create(
        (
          <Menu.ContextMenu items={items} onAction={() => {}}>
            <></>
          </Menu.ContextMenu>
        ) as never
      )
    })
    expect(stubOf(root!, 'OneNativeMenu').props).toMatchObject({
      previewWidth: 0,
      previewHeight: 0,
    })
    expect(menuChildren(root!)).toHaveLength(1)
  })

  it('rejects a preview without its box', () => {
    expect(() =>
      act(() => {
        create(
          (
            <Menu.ContextMenu items={items} onAction={() => {}} preview={<></>}>
              <></>
            </Menu.ContextMenu>
          ) as never
        )
      })
    ).toThrow('Swift.ContextMenu previewWidth must be a positive number')
  })

  it('rejects a box without a preview', () => {
    expect(() =>
      act(() => {
        create(
          (
            <Menu.ContextMenu
              items={items}
              onAction={() => {}}
              previewWidth={240}
              previewHeight={120}
            >
              <></>
            </Menu.ContextMenu>
          ) as never
        )
      })
    ).toThrow('Swift.ContextMenu previewWidth and previewHeight need a preview')
  })

  it('rejects a preview on a tap menu', () => {
    expect(() =>
      act(() => {
        create(
          (
            <Menu.Menu
              accessibilityLabel="menu"
              items={items}
              onAction={() => {}}
              preview={<></>}
              previewWidth={240}
              previewHeight={120}
            >
              <></>
            </Menu.Menu>
          ) as never
        )
      })
    ).toThrow('Swift.Menu takes no preview; use Swift.ContextMenu')
  })
})
