// semantic recipes for bounded SwiftUI controls; the SDK supplies signatures and style cases.
export type ScalarType = 'string' | 'boolean' | 'Double'
export type ControlField = {
  type: ScalarType | 'objects'
  default: string | boolean | number
  enum?: string
  publicType?: string
  jsDefault?: string
  nativeValue?: string
  // native-only prop computed from the public props; not part of the public interface.
  derived?: boolean
  // for `objects`: the payload type name, its element fields, and any public type
  // overrides for those fields (the native side always carries the scalar).
  payload?: {
    name: string
    element: Record<string, ScalarType>
    publicTypes?: Record<string, string>
    // fields a caller may omit; the native struct still carries the scalar default.
    optional?: readonly string[]
  }
}
// a two-way value using the shared controlled protocol: optimistic native state,
// numbered events, acknowledgement and reset revisions.
export type ControlValue = {
  type: ScalarType
  prop: string
  event: string
  initial: string | boolean | number
  publicType?: string
  nativeValue?: string
  eventValue?: string
}
// a one-way native signal with no value, numbered so a fixture can assert exact counts.
export type ControlAction = {
  // public callback prop, for example onPress
  prop: string
  // native event suffix, for example Press for onNative<Control>Press
  event: string
  // extra event fields, passed to the public callback in declaration order.
  payload?: Record<string, ScalarType>
}
export type ModifierSelector = {
  name: string
  parameters: readonly { label: string; type: string }[]
  requirements: readonly string[]
}
export type Control = {
  name: string
  value?: ControlValue
  focus?: boolean
  actions?: readonly ControlAction[]
  fields: Record<string, ControlField>
  constructors: readonly {
    type: string
    parameters: readonly { label: string; type: string }[]
  }[]
  // modifiers the recipe applies directly, selected from the SDK for provenance.
  methods?: readonly ModifierSelector[]
  swift: string
  extraSwift?: string
  validate: string
  // how the control occupies the box React Native gave it. the default is measured:
  // SwiftUI reports its ideal height and Yoga sizes the row, which is why no control
  // declares a height. `fill` is for content with no ideal height, like video, which
  // takes the box instead. `presentation` renders nothing inline and takes no space.
  layout?: 'fill' | 'presentation'
  // frameworks the generated Swift needs beyond SwiftUI and UIKit, such as AVKit.
  imports?: readonly string[]
}

export const commonFields = {
  label: { type: 'string', default: '' },
  disabled: { type: 'boolean', default: false },
} as const

// a list of buttons that report an id back, shared by the dialogs and by the empty state.
// the buttons travel as data so one host renders every action.
export const actionsField = {
  type: 'objects',
  default: '',
  payload: {
    name: 'DialogAction',
    element: { id: 'string', label: 'string', role: 'string' },
    publicTypes: { role: 'Styles.ButtonRole' },
    optional: ['role'],
  },
} as const

export const actionsValidate = (name: string) => `  for (const action of actions) {
    if (typeof action?.id !== 'string' || typeof action?.label !== 'string') throw new Error('${name} actions must contain string id and label fields')
    if (action.role) assertSwiftUIValue('ButtonRole', action.role, Number.parseFloat(String(Platform.Version)))
  }
  if (new Set(actions.map(action => action.id)).size !== actions.length) throw new Error('${name} action ids must be unique')`

// action lists share buttons, with an optional extra event argument.
export const actionButtons = (
  indent: string,
  extraArg = ''
) => `${indent}ForEach(model.actions, id: \\.id) { action in
${indent}  Button(role: OneNativeGenerated.buttonRole(action.role), action: { model.action(action.id${extraArg}) }) {
${indent}    Text(action.label)
${indent}  }
${indent}}`
