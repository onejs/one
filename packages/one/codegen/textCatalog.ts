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
]

const textFields = {
  ...commonFields,
  prompt: { type: 'string', default: '' },
} as const

const textModifiers = `      .onSubmit(of: .text) { model.submit() }`

// focus uses @FocusState and the controlled protocol.
export const textControls: Control[] = [
  {
    name: 'TextField',
    value: { type: 'string', prop: 'text', event: 'onTextChange', initial: '', sync: true },
    focus: true,
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
    validate: `  if (typeof text !== 'string' && !isSyncState(text)) throw new Error('TextField text must be a string or NativeState handle')`,
  },
  {
    name: 'SecureField',
    value: { type: 'string', prop: 'text', event: 'onTextChange', initial: '', sync: true },
    focus: true,
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
    validate: `  if (typeof text !== 'string' && !isSyncState(text)) throw new Error('SecureField text must be a string or NativeState handle')`,
  },
  {
    // multi-line input. it has no label, prompt, style or submit: return inserts a
    // newline, and the editor scrolls its own text inside the box React Native gives it.
    name: 'TextEditor',
    layout: 'fill',
    value: { type: 'string', prop: 'text', event: 'onTextChange', initial: '', sync: true },
    focus: true,
    fields: {},
    constructors: [
      {
        type: 'TextEditor',
        parameters: [{ label: 'text', type: 'SwiftUICore.Binding<Swift.String>' }],
      },
    ],
    swift: `TextEditor(text: Binding(
        get: { model.controlled.value },
        set: { value in model.change(value) }
      ))`,
    validate: `  if (typeof text !== 'string' && !isSyncState(text)) throw new Error('TextEditor text must be a string or NativeState handle')`,
  },
]
