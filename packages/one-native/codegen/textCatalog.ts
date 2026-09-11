import { commonFields, type Control, type ModifierSelector } from './controlTypes'

const submitModifiers: readonly ModifierSelector[] = [
  {
    name: 'onSubmit',
    parameters: [
      { label: 'of', type: 'SwiftUI.SubmitTriggers' },
      { label: '_', type: '@escaping () -> Swift.Void' },
    ],
    requirements: [],
  },
  {
    name: 'autocorrectionDisabled',
    parameters: [{ label: '_', type: 'Swift.Bool' }],
    requirements: [],
  },
]

const textFields = {
  ...commonFields,
  prompt: { type: 'string', default: '' },
  textFieldStyle: { type: 'string', default: 'automatic', enum: 'TextFieldStyle' },
  submitLabel: { type: 'string', default: '', enum: 'SubmitLabel' },
  textInputAutocapitalization: {
    type: 'string',
    default: '',
    enum: 'TextInputAutocapitalization',
  },
  autocorrectionDisabled: { type: 'boolean', default: false },
} as const

const textModifiers = `      .oneNativeTextFieldStyle(model.textFieldStyle)
      .oneNativeSubmitLabel(model.submitLabel)
      .oneNativeTextInputAutocapitalization(model.textInputAutocapitalization)
      .autocorrectionDisabled(model.autocorrectionDisabled)
      .onSubmit(of: .text) { model.submit() }`

// keyboard type and programmatic focus are not bound yet; SwiftUI exposes them through
// UIKit types and @FocusState, neither of which the current prop pipeline carries.
export const textControls: Control[] = [
  {
    name: 'TextField',
    value: { type: 'string', prop: 'text', event: 'onTextChange', initial: '' },
    actions: [{ prop: 'onSubmit', event: 'Submit' }],
    fields: {
      ...textFields,
      axis: { type: 'string', default: 'horizontal', enum: 'Axis' },
    },
    constructors: [
      {
        type: 'TextField',
        parameters: [
          { label: 'text', type: 'SwiftUICore.Binding<Swift.String>' },
          { label: 'prompt', type: 'SwiftUICore.Text?' },
          { label: 'axis', type: 'SwiftUICore.Axis' },
          { label: 'label', type: '() -> Label' },
        ],
      },
    ],
    methods: submitModifiers,
    swift: `TextField(text: Binding(
        get: { model.controlled.value },
        set: { value in model.change(value) }
      ), prompt: model.prompt.isEmpty ? nil : Text(model.prompt), axis: OneNativeGenerated.axis(model.axis)) {
        Text(model.label)
      }
${textModifiers}`,
    validate: `  if (typeof text !== 'string') throw new Error('TextField text must be a string')`,
    height: {
      default: 44,
      when: [{ prop: 'axis', values: ['vertical'], height: 120 }],
    },
  },
  {
    name: 'SecureField',
    value: { type: 'string', prop: 'text', event: 'onTextChange', initial: '' },
    actions: [{ prop: 'onSubmit', event: 'Submit' }],
    fields: textFields,
    constructors: [
      {
        type: 'SecureField',
        parameters: [
          { label: 'text', type: 'SwiftUICore.Binding<Swift.String>' },
          { label: 'prompt', type: 'SwiftUICore.Text?' },
          { label: 'label', type: '() -> Label' },
        ],
      },
    ],
    methods: submitModifiers,
    swift: `SecureField(text: Binding(
        get: { model.controlled.value },
        set: { value in model.change(value) }
      ), prompt: model.prompt.isEmpty ? nil : Text(model.prompt)) {
        Text(model.label)
      }
${textModifiers}`,
    validate: `  if (typeof text !== 'string') throw new Error('SecureField text must be a string')`,
    height: { default: 44 },
  },
]
