import { describe, expect, it } from 'vitest'
import { Compose } from '../src/compose'
import { createSyncState } from '../src/syncStore'
import {
  validateAlertDialogProps,
  validateBoxProps,
  validateButtonProps,
  validateColumnProps,
  validateDialogProps,
  validateProgressIndicatorProps,
  validateRowProps,
  validateSliderProps,
  validateSwitchProps,
  validateTextFieldProps,
  validateTextProps,
} from '../src/composeValidation'

// off android every Compose node throws: a missing stub is undefined at the
// call site, which React reads as a component type it cannot render.
describe('compose surface', () => {
  it('throws for every node without the native build', () => {
    for (const name of [
      'Column',
      'Row',
      'Box',
      'Text',
      'Button',
      'Switch',
      'TextField',
      'Slider',
      'AlertDialog',
      'Dialog',
      'ProgressIndicator',
    ])
      expect(
        () => (Compose as Record<string, (props: object) => unknown>)[name]({}),
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
    ).toThrow('Compose TextField text must be a string or NativeState handle')
    expect(() =>
      validateTextFieldProps({
        text: createSyncState('held'),
        onTextChange: () => {},
      })
    ).not.toThrow()
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
