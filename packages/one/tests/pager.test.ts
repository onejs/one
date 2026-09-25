import { createElement } from 'react'
import TestRenderer from 'react-test-renderer'
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  // later entries win, like the real flatten; registered ids never appear here.
  StyleSheet: {
    flatten: (function flatten(
      style: unknown,
      into: Record<string, unknown> = {}
    ): Record<string, unknown> {
      if (Array.isArray(style)) style.forEach((entry) => flatten(entry, into))
      else if (style && typeof style === 'object') Object.assign(into, style)
      return into
    }) as (style: unknown) => Record<string, unknown>,
  },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => `host-${name}`,
}))

let PagerModule: typeof import('../src/platform/Pager.native')

beforeAll(async () => {
  PagerModule = await import('../src/platform/Pager.native')
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

  it('sees explicit sizing through nested style arrays', () => {
    // StyleSheet.flatten recurses, so a height buried in a nested array still
    // counts as caller sizing and the flex default stays off.
    const base = {
      children: pages(),
      selection: 'a',
      onSelectionChange: () => {},
    }
    const style = [[{ height: 100 }]]
    const explicit = pagerStyle({ ...base, style })
    expect(explicit[0]).toEqual({ alignSelf: 'stretch' })
    expect(explicit[1]).toBe(style)
  })
})
