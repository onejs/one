import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
import type { ListStyle } from './generated/swiftui'

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
  children: ReactNode
}

export interface LazyVStackProps extends ViewProps {
  alignment?: LazyVStackAlignment
  children: ReactNode
}

export interface LazyHStackProps extends ViewProps {
  alignment?: LazyHStackAlignment
  children: ReactNode
}
