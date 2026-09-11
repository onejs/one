// semantic recipes for bounded SwiftUI controls; the SDK supplies signatures and style cases.
export type ControlField = {
  type: 'string' | 'boolean' | 'Double' | 'options'
  default: string | boolean | number
  enum?: string
  publicType?: string
  jsDefault?: string
  nativeValue?: string
  // native-only prop computed from the public props; not part of the public interface.
  derived?: boolean
}
// a two-way value using the shared controlled protocol: optimistic native state,
// numbered events, acknowledgement and reset revisions.
export type ControlValue = {
  type: 'string' | 'boolean' | 'Double'
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
  // the host has no intrinsic size in Yoga, so the adapter supplies a default height.
  height: {
    default: number
    when?: readonly { prop: string; values: readonly string[]; height: number }[]
  }
}

export const commonFields = {
  label: { type: 'string', default: '' },
  disabled: { type: 'boolean', default: false },
} as const
