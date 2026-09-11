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
  // a presentation host renders nothing inline and takes no layout space. every other
  // control is measured by SwiftUI, so none of them declares a height.
  presentation?: true
}

export const commonFields = {
  label: { type: 'string', default: '' },
  disabled: { type: 'boolean', default: false },
} as const
