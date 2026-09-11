import type { Control, ModifierSelector } from './controlTypes'

// the dialog buttons travel as data so one zero-size host renders every action.
const dialogActions = {
  type: 'objects',
  default: '',
  payload: {
    name: 'DialogAction',
    element: { id: 'string', label: 'string', role: 'string' },
    publicTypes: { role: 'Styles.ButtonRole' },
    optional: ['role'],
  },
} as const

const dialogFields = {
  title: { type: 'string', default: '' },
  message: { type: 'string', default: '' },
  actions: dialogActions,
} as const

// the buttons live inside the presented dialog, so the host must not carry a `disabled`
// field: SwiftUI's .disabled propagates through the environment into the actions.
const dialogValidate = (name: string) => `  for (const action of actions) {
    if (typeof action?.id !== 'string' || typeof action?.label !== 'string') throw new Error('${name} actions must contain string id and label fields')
    if (action.role) assertSwiftUIValue('ButtonRole', action.role, Number.parseFloat(String(Platform.Version)))
  }
  if (!actions.length) throw new Error('${name} must have at least one action')
  if (new Set(actions.map(action => action.id)).size !== actions.length) throw new Error('${name} action ids must be unique')`

const dialogButtons = `        ForEach(model.actions, id: \\.id) { action in
          Button(role: OneNativeGenerated.buttonRole(action.role), action: { model.action(action.id) }) {
            Text(action.label)
          }
        }`

const viewRequirements = ['A : SwiftUICore.View', 'M : SwiftUICore.View']
const dialogModifier = (
  name: string,
  extra: readonly { label: string; type: string }[]
): ModifierSelector => ({
  name,
  parameters: [
    { label: '_', type: 'SwiftUICore.LocalizedStringKey' },
    { label: 'isPresented', type: 'SwiftUICore.Binding<Swift.Bool>' },
    ...extra,
    { label: 'actions', type: '() -> A' },
    { label: 'message', type: '() -> M' },
  ],
  requirements: viewRequirements,
})

export const presentationControls: Control[] = [
  {
    name: 'Alert',
    value: {
      type: 'boolean',
      prop: 'isPresented',
      event: 'onIsPresentedChange',
      initial: false,
    },
    actions: [{ prop: 'onAction', event: 'Action', payload: { id: 'string' } }],
    fields: dialogFields,
    constructors: [],
    methods: [dialogModifier('alert', [])],
    swift: `Color.clear
      .alert(LocalizedStringKey(model.title), isPresented: Binding(
        get: { model.controlled.value },
        set: { value in model.change(value) }
      )) {
${dialogButtons}
      } message: {
        if !model.message.isEmpty { Text(model.message) }
      }`,
    validate: dialogValidate('Alert'),
    height: 'presentation',
  },
  {
    name: 'ConfirmationDialog',
    value: {
      type: 'boolean',
      prop: 'isPresented',
      event: 'onIsPresentedChange',
      initial: false,
    },
    actions: [{ prop: 'onAction', event: 'Action', payload: { id: 'string' } }],
    fields: {
      ...dialogFields,
      titleVisibility: { type: 'string', default: 'automatic', enum: 'Visibility' },
    },
    constructors: [],
    methods: [
      dialogModifier('confirmationDialog', [
        { label: 'titleVisibility', type: 'SwiftUICore.Visibility' },
      ]),
    ],
    swift: `Color.clear
      .confirmationDialog(LocalizedStringKey(model.title), isPresented: Binding(
        get: { model.controlled.value },
        set: { value in model.change(value) }
      ), titleVisibility: OneNativeGenerated.visibility(model.titleVisibility)) {
${dialogButtons}
      } message: {
        if !model.message.isEmpty { Text(model.message) }
      }`,
    validate: dialogValidate('ConfirmationDialog'),
    height: 'presentation',
  },
]
