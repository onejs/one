export type * from './generated/types'
export type * from './generated/controlTypes'
export type * from './generated/sheetTypes'
export type * from './generated/popoverTypes'
export type * from './generated/containerTypes'
export type * from './listTypes'
export type * from './groupTypes'
export type * from './textTypes'
import type { ReactNode } from 'react'
import type { TabViewSlotName } from './generated/viewSlots'

export interface TabViewSlotProps {
  name: TabViewSlotName
  height: number
  children: ReactNode
}

export interface TabViewBottomAccessoryProps {
  children?: ReactNode
  inline?: ReactNode
  expanded?: ReactNode
}
