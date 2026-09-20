import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// same seam as edgeFade.test.ts: plain functions over the spec modules,
// react never mounted, only the touched react-native surface mocked.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  View: () => null,
  StyleSheet: {
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    flatten: (style: unknown) => style,
  },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

let Mask: typeof import('../src/effects/Mask.native').Mask
let RN: typeof import('react-native')
let createElement: typeof import('react').createElement

beforeAll(async () => {
  Mask = (await import('../src/effects/Mask.native')).Mask
  RN = await import('react-native')
  createElement = (await import('react')).createElement
})

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('Mask', () => {
  it('mounts the mask subtree first, untouchable and filling', () => {
    const maskElement = createElement(RN.View, { testID: 'mask' })
    const element = Mask({ maskElement, children: 'content' } as never)
    expect(element.type).toEqual({ __component: 'OneNativeMask' })
    const [mask, content] = element.props.children as Array<{
      type: unknown
      props: Record<string, unknown>
    }>
    expect(mask?.type).toBe(RN.View)
    expect(mask?.props.pointerEvents).toBe('none')
    expect(mask?.props.style).toEqual(RN.StyleSheet.absoluteFill)
    expect(mask?.props.children).toBe(maskElement)
    expect(content).toBe('content')
  })

  it('warns once and renders unmasked without an element', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = Mask({ children: 'content' } as never)
    expect(first.type).toBe(RN.View)
    expect(first.props.children).toBe('content')
    Mask({ maskElement: 'nope', children: 'content' } as never)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]?.[0]).toContain('maskElement')
  })
})
