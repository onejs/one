// semantic recipes for bounded SwiftUI controls; the SDK supplies signatures and style cases.
export type ControlField = {
  type: 'string' | 'boolean' | 'Double' | 'options'
  default: string | boolean | number
  enum?: string
  publicType?: string
  jsDefault?: string
  nativeValue?: string
}
export type Control = {
  name: string
  valueType: 'string' | 'boolean' | 'Double'
  valueProp: string
  event: string
  initial: string | boolean | number
  publicValueType?: string
  nativeValue?: string
  eventValue?: string
  fields: Record<string, ControlField>
  constructor: { type: string; parameters: readonly { label: string; type: string }[] }
  swift: string
  extraSwift?: string
  validate: string
  height: string
}

export const commonFields = {
  label: { type: 'string', default: '' },
  disabled: { type: 'boolean', default: false },
} as const
