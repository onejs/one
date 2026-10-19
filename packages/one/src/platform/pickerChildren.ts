import type { ReactNode } from 'react'
import type { PickerProps } from './generated/controlTypes'

// a picker's options: tagged text composed under the picker, the way SwiftUI's
// Picker content builder takes views. anything else throws.
export interface PickerChildrenSlot {
  children?: ReactNode
}

export type PickerWithChildrenProps = PickerProps & PickerChildrenSlot
