import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
import type {
  ListSectionSpacing,
  ListStyle,
  Prominence,
  Visibility,
} from './generated/swiftui'

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

export const listRowSeparatorEdges = ['all', 'top', 'bottom'] as const
export type ListRowSeparatorEdges = (typeof listRowSeparatorEdges)[number]

export const listSectionMarginsEdges = [
  'all',
  'top',
  'leading',
  'bottom',
  'trailing',
  'horizontal',
  'vertical',
] as const
export type ListSectionMarginsEdges = (typeof listSectionMarginsEdges)[number]

// the list row and section modifiers, shared by List and Section and spelled the same
// in swiftStyle for rows. SwiftUI takes EdgeInsets and edge sets, which cross the
// bridge decomposed: one prop per argument, one prop per inset edge.
export interface ListModifierProps {
  listRowSeparator?: Visibility
  listRowSeparatorEdges?: ListRowSeparatorEdges
  listRowInsetsTop?: number
  listRowInsetsLeading?: number
  listRowInsetsBottom?: number
  listRowInsetsTrailing?: number
  listSectionSpacing?: ListSectionSpacing | number
  listSectionMarginsLength?: number
  listSectionMarginsEdges?: ListSectionMarginsEdges
  headerProminence?: Prominence
}

export interface ListProps extends ViewProps, ListModifierProps {
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
  spacing?: number
  children: ReactNode
}

export interface LazyHStackProps extends ViewProps {
  alignment?: LazyHStackAlignment
  spacing?: number
  children: ReactNode
}
