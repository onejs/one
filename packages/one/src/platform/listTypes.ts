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
  selection?: string[]
  onSelectionChange?: (selection: string[]) => void
  swiftStyle?: OneNativeStyle
  children: ReactNode
}

export interface ScrollViewProps extends ViewProps {
  axes?: ScrollViewAxes
  showsIndicators?: boolean
  swiftStyle?: OneNativeStyle
  children: ReactNode
}

export interface LazyVStackProps extends ViewProps {
  swiftStyle?: OneNativeStyle
  alignment?: LazyVStackAlignment
  spacing?: number
  children: ReactNode
}

export interface LazyHStackProps extends ViewProps {
  swiftStyle?: OneNativeStyle
  alignment?: LazyHStackAlignment
  spacing?: number
  children: ReactNode
}

// SwiftUI's OutlineGroup over a tree: `idKey` names the property holding each item's
// stable id (Identifiable), and `childrenKey` the property holding its child items,
// which SwiftUI's `children:` key path names. an item whose property is missing or
// null is a leaf; an empty array is a branch with nothing in it. ids must be
// strings or numbers and unique across the whole tree, because each row's content is
// matched to its node by id. ViewProps.children is ReactNode, which cannot hold the
// row closure, so the view omits it and declares the closure instead.
export interface OutlineGroupProps<Item extends object> extends Omit<ViewProps, 'children'> {
  swiftStyle?: OneNativeStyle
  data: readonly Item[]
  idKey?: keyof Item
  childrenKey: keyof Item
  children: (item: Item) => ReactNode
}

// SwiftUI's UnitPoint: a named SDK constant or UnitPoint(x:y:) in unit coordinates.
export const unitPoints = {
  zero: { x: 0, y: 0 },
  center: { x: 0.5, y: 0.5 },
  leading: { x: 0, y: 0.5 },
  trailing: { x: 1, y: 0.5 },
  top: { x: 0.5, y: 0 },
  bottom: { x: 0.5, y: 1 },
  topLeading: { x: 0, y: 0 },
  topTrailing: { x: 1, y: 0 },
  bottomLeading: { x: 0, y: 1 },
  bottomTrailing: { x: 1, y: 1 },
} as const
export type UnitPointName = keyof typeof unitPoints
export type UnitPoint = UnitPointName | { x: number; y: number }

// SwiftUI's ScrollViewProxy. scrollTo matches a view whose swiftStyle.id equals id
// in a scroll view inside the reader; an id nothing carries scrolls nothing, as in
// SwiftUI. a nil or omitted anchor scrolls the least distance that reveals the view.
export interface ScrollViewProxy {
  scrollTo(id: string, anchor?: UnitPoint | null): void
}

// ViewProps.children is ReactNode, which cannot hold the content closure, so the
// reader omits it and declares the closure instead.
export interface ScrollViewReaderProps extends Omit<ViewProps, 'children'> {
  swiftStyle?: OneNativeStyle
  children: (proxy: ScrollViewProxy) => ReactNode
}
