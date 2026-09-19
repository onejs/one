import { act, createElement } from 'react'
import TestRenderer from 'react-test-renderer'
import { beforeAll, describe, expect, it, vi } from 'vitest'

// the compose leaves read the spec through codegenNativeComponent and a context, so the test
// renders them: the mock turns the native node into an element the renderer can mount, and the
// assertions read the props that reach it.
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', async () => {
  const { createElement } = await import('react')
  return { default: () => (props: any) => createElement('div', props) }
})

let Compose: typeof import('../src/compose.native').Compose
let Unsupported: typeof import('../src/compose').Compose
let codepoints: typeof import('../src/generated/composeIcons').composeIconCodepoints

beforeAll(async () => {
  Compose = (await import('../src/compose.android')).Compose
  Unsupported = (await import('../src/compose')).Compose
  codepoints = (await import('../src/generated/composeIcons')).composeIconCodepoints
})

const glyph = (name: string) => String.fromCodePoint(codepoints[name as never])

const render = (component: (props: any) => any, props: object): any => {
  let renderer: TestRenderer.ReactTestRenderer | undefined
  act(() => {
    renderer = TestRenderer.create(createElement(component as never, props as never))
  })
  return renderer!.toJSON()
}

describe('icon', () => {
  it('renders a Material Symbols glyph as an icon node', () => {
    expect(render(Compose.Icon, { name: 'star' })).toMatchObject({
      type: 'div',
      props: {
        nodeType: 'icon',
        text: glyph('star'),
        fontSize: 24,
        iconFilled: false,
      },
    })
  })

  it('carries size and filled to the native props', () => {
    expect(render(Compose.Icon, { name: 'home', size: 32, filled: true })).toMatchObject({
      props: { text: glyph('home'), fontSize: 32, iconFilled: true },
    })
  })

  it('keeps supplementary-plane names as surrogate pairs', () => {
    expect(render(Compose.Icon, { name: 'wb_twilight_2' })).toMatchObject({
      props: { text: '\u{fff1f}' },
    })
    expect(glyph('wb_twilight_2')).toHaveLength(2)
  })

  it('rejects a name that is not a Material Symbols name', () => {
    expect(() => render(Compose.Icon, { name: 'not-an-icon' })).toThrow(
      'Compose Icon name must be a Material Symbols name, got "not-an-icon"'
    )
    expect(() => render(Compose.Icon, { name: '' })).toThrow(
      'Compose Icon name must be a non-empty string'
    )
  })

  it('rejects a size that is not positive', () => {
    expect(() => render(Compose.Icon, { name: 'star', size: 0 })).toThrow(
      'Compose Icon size must be a positive finite number'
    )
    expect(() => render(Compose.Icon, { name: 'star', size: Number.NaN })).toThrow(
      'Compose Icon size must be a positive finite number'
    )
  })

  it('requires an Android native build outside Android', () => {
    expect(() => Unsupported.Icon({ name: 'star' })).toThrow(
      'Compose.Icon requires an Android native build with @vxrn/native installed'
    )
  })
})

describe('button', () => {
  it('renders a leading icon beside the label', () => {
    expect(render(Compose.Button, { label: 'Add', icon: 'add' })).toMatchObject({
      type: 'div',
      props: {
        nodeType: 'button',
        label: 'Add',
        icon: glyph('add'),
        iconFilled: false,
      },
    })
  })

  it('carries a filled leading icon to the native props', () => {
    expect(
      render(Compose.Button, { label: 'Add', icon: 'add', iconFilled: true })
    ).toMatchObject({
      props: { icon: glyph('add'), iconFilled: true },
    })
  })

  it('rejects an icon that is not a Material Symbols name', () => {
    expect(() => render(Compose.Button, { label: 'Add', icon: 'not-an-icon' })).toThrow(
      'Compose Button icon must be a Material Symbols name, got "not-an-icon"'
    )
  })
})
