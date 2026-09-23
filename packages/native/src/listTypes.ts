import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
import type { ListStyle } from './generated/swiftui'
import type { OneNativeStyle } from './generated/controlTypes'

// hand-written until the container emitter carries these views, when these merge into
// src/generated/containerTypes.ts and this file goes away.
export const scrollViewAxes = ['vertical', 'horizontal', 'both'] as const
export type ScrollViewAxes = (typeof scrollViewAxes)[number]

export const lazyVStackAlignments = ['leading', 'center', 'trailing'] as const
export type LazyVStackAlignment = (typeof lazyVStackAlignments)[number]

export const lazyHStackAlignments = [
  'top',
  'center',
  'bottom',
  'firstTextBaseline',
  'lastTextBaseline',
] as const
export type LazyHStackAlignment = (typeof lazyHStackAlignments)[number]

export interface ListProps extends ViewProps {
  listStyle?: ListStyle
  children: ReactNode
}

export interface ScrollViewProps extends ViewProps {
  axes?: ScrollViewAxes
  showsIndicators?: boolean
  swiftStyle?: OneNativeStyle
  children: ReactNode
}

export interface LazyVStackProps extends ViewProps {
  alignment?: LazyVStackAlignment
  spacing?: number
  children: ReactNode
}

export interface LazyHStackProps extends ViewProps {
  alignment?: LazyHStackAlignment
  spacing?: number
  children: ReactNode
}
