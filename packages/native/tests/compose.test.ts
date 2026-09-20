import { act, createElement } from 'react'
import TestRenderer from 'react-test-renderer'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  validateAlertDialogProps,
  validateBoxProps,
  validateButtonProps,
  validateColumnProps,
  validateDialogProps,
  validateIconProps,
  validateProgressIndicatorProps,
  validateRowProps,
  validateSliderProps,
  validateSwitchProps,
  validateTextFieldProps,
  validateTextProps,
} from '../src/composeValidation'

// the compose leaves read the spec through codegenNativeComponent and a context, so the test
// renders them: the mock turns the native node into an element the renderer can mount, and the
// assertions read the props that reach it.
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', async () => {
  const { createElement } = await import('react')
  return { default: () => (props: any) => createElement('div', props) }
})

let Compose: typeof import('../src/compose.android').Compose
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
    expect(() => render(Compose.Icon, { name: 'toString' })).toThrow(
      'Compose Icon name must be a Material Symbols name, got "toString"'
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

// off android every Compose node throws: a missing stub is undefined at the
// call site, which React reads as a component type it cannot render.
describe('compose surface', () => {
  it('throws for every node without the native build', () => {
    for (const name of [
      'Column',
      'Row',
      'Box',
      'Text',
      'Icon',
      'Button',
      'Switch',
      'TextField',
      'Slider',
      'AlertDialog',
      'Dialog',
      'ProgressIndicator',
    ])
      expect(
        () => (Unsupported as Record<string, (props: object) => unknown>)[name]({}),
        name
      ).toThrow(`Compose.${name} requires an Android native build`)
  })
})

describe('compose container validation', () => {
  it('accepts defaults and explicit spacing', () => {
    expect(() => validateColumnProps({})).not.toThrow()
    expect(() => validateRowProps({})).not.toThrow()
    expect(() => validateBoxProps({})).not.toThrow()
    expect(() =>
      validateColumnProps({
        horizontalAlignment: 'centerHorizontally',
        verticalArrangement: 'center',
        spacing: 8,
      })
    ).not.toThrow()
  })

  it('rejects unknown alignments and spacing with space distribution', () => {
    expect(() =>
      validateColumnProps({ horizontalAlignment: 'middle' as never })
    ).toThrow('Compose Column horizontalAlignment must be one of')
    expect(() => validateRowProps({ horizontalArrangement: 'spaceBetween', spacing: 4 })).toThrow(
      'Compose Row spacing cannot be combined with a space-distribution arrangement'
    )
    expect(() => validateBoxProps({ contentAlignment: 'middle' as never })).toThrow(
      'Compose Box contentAlignment must be one of'
    )
  })
})

describe('compose text and button validation', () => {
  it('accepts a full text and button prop set', () => {
    expect(() =>
      validateTextProps({
        text: 'hello',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        maxLines: 2,
      })
    ).not.toThrow()
    expect(() =>
      validateButtonProps({ label: 'Save', variant: 'outlined', tone: 'danger' })
    ).not.toThrow()
  })

  it('rejects bad typography and empty labels', () => {
    expect(() => validateTextProps({ text: 42 as never })).toThrow(
      'Compose Text text must be string'
    )
    expect(() => validateTextProps({ text: 'hi', fontSize: 0 })).toThrow(
      'Compose Text fontSize must be a positive finite number'
    )
    expect(() => validateTextProps({ text: 'hi', maxLines: 1.5 })).toThrow(
      'Compose Text maxLines must be a positive integer'
    )
    expect(() => validateButtonProps({ label: '  ' })).toThrow(
      'Compose Button label must be a non-empty string'
    )
  })
})

describe('compose icon validation', () => {
  it('accepts defaults and explicit size and fill', () => {
    expect(() => validateIconProps({ name: 'star' })).not.toThrow()
    expect(() => validateIconProps({ name: 'home', size: 32, filled: true })).not.toThrow()
    expect(() =>
      validateButtonProps({ label: 'Add', icon: 'add', iconFilled: true })
    ).not.toThrow()
  })

  it('rejects unknown names and non-positive sizes', () => {
    expect(() => validateIconProps({ name: 'not-an-icon' as never })).toThrow(
      'Compose Icon name must be a Material Symbols name, got "not-an-icon"'
    )
    expect(() => validateIconProps({ name: '' as never })).toThrow(
      'Compose Icon name must be a non-empty string'
    )
    expect(() => validateIconProps({ name: 'star', size: 0 })).toThrow(
      'Compose Icon size must be a positive finite number'
    )
    expect(() =>
      validateButtonProps({ label: 'Add', icon: 'not-an-icon' as never })
    ).toThrow('Compose Button icon must be a Material Symbols name, got "not-an-icon"')
  })
})

describe('compose switch validation', () => {
  it('requires a change handler', () => {
    expect(() => validateSwitchProps({ isOn: false, onIsOnChange: () => {} })).not.toThrow()
    expect(() => validateSwitchProps({ isOn: true, onIsOnChange: undefined as never })).toThrow(
      'Compose Switch onIsOnChange must be a function'
    )
  })
})

describe('compose textfield validation', () => {
  it('accepts a full textfield prop set', () => {
    expect(() =>
      validateTextFieldProps({
        text: '',
        onTextChange: () => {},
        label: 'Name',
        placeholder: 'Your name',
        variant: 'outlined',
        keyboardType: 'email',
        secureText: true,
      })
    ).not.toThrow()
  })

  it('rejects non-string text, missing handler, and unknown variants', () => {
    expect(() =>
      validateTextFieldProps({ text: undefined as never, onTextChange: () => {} })
    ).toThrow('Compose TextField text must be string')
    expect(() =>
      validateTextFieldProps({ text: '', onTextChange: undefined as never })
    ).toThrow('Compose TextField onTextChange must be a function')
    expect(() =>
      validateTextFieldProps({ text: '', onTextChange: () => {}, variant: 'glass' as never })
    ).toThrow('Compose TextField variant must be one of filled, outlined')
    expect(() =>
      validateTextFieldProps({
        text: '',
        onTextChange: () => {},
        keyboardType: 'emoji' as never,
      })
    ).toThrow('Compose TextField keyboardType must be one of')
  })
})

describe('compose slider validation', () => {
  it('accepts defaults and discrete steps', () => {
    expect(() => validateSliderProps({ value: 0.5, onValueChange: () => {} })).not.toThrow()
    expect(() =>
      validateSliderProps({
        value: 25,
        onValueChange: () => {},
        minimumValue: 0,
        maximumValue: 100,
        step: 5,
      })
    ).not.toThrow()
  })

  it('rejects inverted bounds, negative steps, and out-of-range values', () => {
    expect(() =>
      validateSliderProps({
        value: 0.5,
        onValueChange: () => {},
        minimumValue: 1,
        maximumValue: 1,
      })
    ).toThrow('Compose Slider minimumValue must be less than maximumValue')
    expect(() =>
      validateSliderProps({ value: 0.5, onValueChange: () => {}, step: -1 })
    ).toThrow('Compose Slider step must be a nonnegative finite number')
    expect(() => validateSliderProps({ value: 2, onValueChange: () => {} })).toThrow(
      'Compose Slider value must be between minimumValue and maximumValue'
    )
    expect(() =>
      validateSliderProps({ value: 0.5, onValueChange: undefined as never })
    ).toThrow('Compose Slider onValueChange must be a function')
  })

  it('rejects step sizes Compose cannot represent exactly', () => {
    expect(() =>
      validateSliderProps({ value: 0.3, onValueChange: () => {}, step: 0.3 })
    ).toThrow('Compose Slider step must evenly divide its range')
    expect(() =>
      validateSliderProps({ value: 0.5, onValueChange: () => {}, step: 0.0005 })
    ).toThrow('Compose Slider step must produce at most 1001 intervals')
    expect(() =>
      validateSliderProps({
        value: 1e12,
        onValueChange: () => {},
        minimumValue: 1e12,
        maximumValue: 1e12 + 1,
      })
    ).toThrow('Compose Slider range must be representable by Android Float values')
  })
})

describe('compose dialog validation', () => {
  it('accepts alert and plain dialog prop sets', () => {
    expect(() =>
      validateAlertDialogProps({
        visible: true,
        title: 'Delete?',
        message: 'This cannot be undone.',
        confirmLabel: 'Delete',
        dismissLabel: 'Cancel',
        onConfirm: () => {},
        onDismiss: () => {},
      })
    ).not.toThrow()
    expect(() => validateDialogProps({ visible: false, onDismiss: () => {} })).not.toThrow()
  })

  it('requires a confirm label and both dialog callbacks', () => {
    expect(() =>
      validateAlertDialogProps({
        visible: true,
        confirmLabel: '',
        onConfirm: () => {},
        onDismiss: () => {},
      })
    ).toThrow('Compose AlertDialog confirmLabel must be a non-empty string')
    expect(() =>
      validateAlertDialogProps({
        visible: true,
        confirmLabel: 'OK',
        onConfirm: undefined as never,
        onDismiss: () => {},
      })
    ).toThrow('Compose AlertDialog onConfirm must be a function')
    expect(() =>
      validateDialogProps({ visible: true, onDismiss: undefined as never })
    ).toThrow('Compose Dialog onDismiss must be a function')
  })
})

describe('compose progress validation', () => {
  it('accepts determinate and indeterminate indicators', () => {
    expect(() => validateProgressIndicatorProps({})).not.toThrow()
    expect(() =>
      validateProgressIndicatorProps({ variant: 'linear', progress: 0.4 })
    ).not.toThrow()
  })

  it('rejects unknown variants and out-of-range progress', () => {
    expect(() => validateProgressIndicatorProps({ variant: 'ring' as never })).toThrow(
      'Compose ProgressIndicator variant must be one of linear, circular'
    )
    expect(() => validateProgressIndicatorProps({ progress: 1.2 })).toThrow(
      'Compose ProgressIndicator progress must be a number from 0 to 1'
    )
  })
})
