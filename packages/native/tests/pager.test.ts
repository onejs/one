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
  it('fills with flex by default and passes an explicit style through untouched', () => {
    const base = {
      children: pages(),
      selection: 'a',
      onSelectionChange: () => {},
    }
    expect(pagerStyle(base)[0]).toEqual({ flex: 1 })
    for (const style of [
      { height: 100 },
      { flex: 2 },
      { flexGrow: 1, flexShrink: 1 },
      { flexShrink: 0 },
      { flexBasis: 100 },
    ])
      expect(pagerStyle({ ...base, style })).toEqual([style])
  })
})
