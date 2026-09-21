import { act, createElement } from 'react'
import TestRenderer from 'react-test-renderer'
import { beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', async () => {
  const { createElement } = await import('react')
  return { default: () => (props: any) => createElement('div', props) }
})

let AdaptivePanel: typeof import('../src/adaptive-panel/adaptive-panel.native').AdaptivePanel
let WebPanel: typeof import('../src/adaptive-panel/adaptive-panel').AdaptivePanel

beforeAll(async () => {
  AdaptivePanel = (await import('../src/adaptive-panel/adaptive-panel.native'))
    .AdaptivePanel
  WebPanel = (await import('../src/adaptive-panel/adaptive-panel')).AdaptivePanel
})

const render = (props: object): any => {
  let renderer: TestRenderer.ReactTestRenderer | undefined
  act(() => {
    renderer = TestRenderer.create(
      createElement(AdaptivePanel as never, { ...props, children: 'panel' } as never)
    )
  })
  return renderer!.toJSON()
}

describe('adaptive panel contract', () => {
  it('renders open state with default detents and system width', () => {
    expect(render({ open: false, onOpenChange: () => {} })).toMatchObject({
      type: 'div',
      props: {
        open: false,
        revision: 0,
        acknowledgedEvent: 0,
        compactDetents: [{ type: 'large', value: 0 }],
        selectedDetentType: '',
        selectedDetentValue: 0,
        detentRevision: 0,
        regularWidth: -1,
      },
    })
  })

  it('converts fraction and height detents to native pairs', () => {
    expect(
      render({
        open: true,
        onOpenChange: () => {},
        compactDetents: ['medium', { fraction: 0.4 }, { height: 240 }],
        regularWidth: 360,
      }).props
    ).toMatchObject({
      compactDetents: [
        { type: 'medium', value: 0 },
        { type: 'fraction', value: 0.4 },
        { type: 'height', value: 240 },
      ],
      regularWidth: 360,
    })
  })

  it('carries a controlled detent selection to native props', () => {
    expect(
      render({
        open: true,
        onOpenChange: () => {},
        compactDetents: ['medium', 'large'],
        selectedDetent: 'medium',
        onSelectedDetentChange: () => {},
        detentRevision: 3,
      }).props
    ).toMatchObject({
      selectedDetentType: 'medium',
      selectedDetentValue: 0,
      detentRevision: 3,
    })
  })

  it('forwards open changes from native state', () => {
    const onOpenChange = vi.fn()
    const props = render({ open: false, onOpenChange }).props
    act(() => {
      props.onNativeAdaptivePanelOpenChange({
        nativeEvent: { open: true, eventCount: 1, revision: 0 },
      })
    })
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('forwards detent changes as public detents', () => {
    const onSelectedDetentChange = vi.fn()
    const props = render({
      open: true,
      onOpenChange: () => {},
      compactDetents: ['medium', 'large'],
      selectedDetent: 'medium',
      onSelectedDetentChange,
    }).props
    act(() => {
      props.onNativeAdaptivePanelDetentChange({
        nativeEvent: { type: 'large', value: 0, eventCount: 1, revision: 0 },
      })
    })
    expect(onSelectedDetentChange).toHaveBeenCalledWith('large')
  })

  it('forwards placement and frame from one layout event', () => {
    const onPlacementChange = vi.fn()
    const onFrameChange = vi.fn()
    const props = render({
      open: true,
      onOpenChange: () => {},
      onPlacementChange,
      onFrameChange,
    }).props
    act(() => {
      props.onNativeAdaptivePanelLayoutChange({
        nativeEvent: {
          placement: 'regular',
          frameX: 700,
          frameY: 0,
          frameWidth: 320,
          frameHeight: 800,
        },
      })
    })
    expect(onPlacementChange).toHaveBeenCalledWith('regular')
    expect(onFrameChange).toHaveBeenCalledWith({ x: 700, y: 0, width: 320, height: 800 })
  })

  it.each([
    [{ open: 'yes' }, 'One.UI.AdaptivePanel open must be a boolean'],
    [
      { open: true, compactDetents: [] },
      'One.UI.AdaptivePanel requires at least one compact detent',
    ],
    [
      { open: true, compactDetents: ['medium', 'medium'] },
      'One.UI.AdaptivePanel compact detents must be unique',
    ],
    [
      { open: true, compactDetents: [{ fraction: 0 }] },
      'Adaptive panel detent must be medium, large',
    ],
    [
      { open: true, selectedDetent: 'medium' },
      'One.UI.AdaptivePanel selectedDetent and onSelectedDetentChange must be provided together',
    ],
    [
      {
        open: true,
        compactDetents: ['medium'],
        selectedDetent: 'large',
        onSelectedDetentChange: () => {},
      },
      'One.UI.AdaptivePanel selectedDetent must be in compactDetents',
    ],
    [
      { open: true, regularWidth: 0 },
      'One.UI.AdaptivePanel regularWidth must be a positive number',
    ],
  ])('rejects %j', (overrides, message) => {
    expect(() => render({ onOpenChange: () => {}, ...overrides })).toThrow(message)
  })

  it('requires a native build on web', () => {
    expect(() => (WebPanel as (props: object) => unknown)({})).toThrow(
      'AdaptivePanel requires a native build with @vxrn/native installed'
    )
  })
})
