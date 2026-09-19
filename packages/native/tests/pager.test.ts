import { createElement } from 'react'
import TestRenderer from 'react-test-renderer'
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  StyleSheet: {
    flatten: (style: unknown): object | undefined =>
      Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : (style as object),
  },
}))

vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => `host-${name}`,
}))

let PagerModule: typeof import('../src/Pager.native')

beforeAll(async () => {
  PagerModule = await import('../src/Pager.native')
})

const pages = () => [
  createElement(PagerModule.Page, { id: 'a', key: 'a', children: 'A' }),
  createElement(PagerModule.Page, { id: 'b', key: 'b', children: 'B' }),
]

const pagerStyle = (props: object) => {
  let tree: TestRenderer.ReactTestRenderer | undefined
  TestRenderer.act(() => {
    tree = TestRenderer.create(createElement(PagerModule.Pager, props))
  })
  const pager = tree!.root.findAll(
    (node) => node.type === 'host-OneNativePager'
  )[0]
  const style = pager.props.style
  tree!.unmount()
  return style as unknown[]
}

describe('pager viewport', () => {
  it('fills height by default and yields to an explicit style', () => {
    const base = {
      children: pages(),
      selection: 'a',
      onSelectionChange: () => {},
    }
    expect(pagerStyle(base)[0]).toEqual({ flex: 1, alignSelf: 'stretch' })
    const style = { height: 100 }
    const explicit = pagerStyle({ ...base, style })
    expect(explicit[0]).toEqual({ alignSelf: 'stretch' })
    expect(explicit[1]).toBe(style)
  })
})
