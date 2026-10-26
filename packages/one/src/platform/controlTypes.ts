import type { ViewProps } from 'react-native'
import type { ControlledEvent } from './controlled'

export type ControlViewProps = Omit<ViewProps, 'children'>
export type ControlledControlProps = ControlViewProps & {
  disabled?: boolean
  revision?: number
}
export type ControlChange<T extends object> = T & { revision: number }
export type NativeControlChange<T extends object> = T & ControlledEvent
export type NumericControlChange = NativeControlChange<{ value: number }>
export type TextControlChange = NativeControlChange<{ text: string }>
