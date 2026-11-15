import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
import type { SDKHandle } from './sdk/wire'
import type { ZStackAlignment } from './generated/containerTypes'
import type { SFSymbolName } from './generated/sfSymbolNames'
import type { ControlGroupStyle } from './generated/swiftui'
import type {
  OneNativeStyle,
  SDKPageTabViewStyleIndexDisplayModeValue,
} from './generated/controlTypes'
import type { ViewSlotConfiguration } from './generated/viewSlots'
import type {
  UICollectionViewDiffableDataSource,
  UITableViewDiffableDataSource,
  UIView,
} from 'one/ios/UIKit'

// hand-written round-2 container types, pending the container emitter (see
// listTypes.ts for round 1). they merge into src/generated/containerTypes.ts
// when the emitter carries these views.
export const swipeActionsEdges = ['leading', 'trailing'] as const
export type SwipeActionsEdge = (typeof swipeActionsEdges)[number]

export interface ControlGroupProps extends ViewProps {
  swiftStyle?: OneNativeStyle
  label?: string
  systemImage?: SFSymbolName | ''
  controlGroupStyle?: ControlGroupStyle
  children: ReactNode
}

export interface DisclosureGroupProps extends ViewProps {
  swiftStyle?: OneNativeStyle
  label: string
  isExpanded: boolean
  onIsExpandedChange: (isExpanded: boolean) => void
  revision?: number
  children: ReactNode
}

// any UIView or UIViewController built through the generated SDK bindings, such as
// `await UICalendarView.init()` from one/ios/UIKit. configure it there; this places it.
export interface UIKitViewProps extends ViewProps {
  view: SDKHandle
}

// a source from One.iOS.collectionCellSource or tableCellSource
export type UIKitContentSource =
  | UICollectionViewDiffableDataSource<number, number>
  | UITableViewDiffableDataSource<number, number>

// react content that UIKit shows. give a source and the item whose cell shows it, or
// onView to place the view with any UIKit API, such as UIStackView.addArrangedSubview.
// the view props style the content's root.
export interface UIKitContentProps extends ViewProps {
  children: ReactNode
  onView?: (view: UIView) => void
  source?: UIKitContentSource
  item?: number
  // a fixed height that skips measurement
  height?: number
  // the height before the first measurement, 44 by default
  estimatedHeight?: number
}

export interface DividerProps extends ViewProps {
  swiftStyle?: OneNativeStyle
}

export interface LinkProps extends ViewProps {
  swiftStyle?: OneNativeStyle
  destination: string
  label?: string
  children?: ReactNode
}

export interface GroupProps extends ViewProps {
  swiftStyle?: OneNativeStyle
  children: ReactNode
}

export interface GroupBoxProps extends ViewProps {
  swiftStyle?: OneNativeStyle
  label?: string
  children?: ReactNode
}

export interface ViewThatFitsProps extends ViewProps {
  swiftStyle?: OneNativeStyle
  axes?: ViewThatFitsAxes
  children: ReactNode
}

export const viewThatFitsAxes = ['horizontal', 'vertical', 'both'] as const
export type ViewThatFitsAxes = (typeof viewThatFitsAxes)[number]

export interface GlassEffectContainerProps extends ViewProps {
  swiftStyle?: OneNativeStyle
  spacing?: number
  children: ReactNode
}

// the geometry SwiftUI proposes to a GeometryReader's content, in points. it
// mirrors GeometryProxy's native size, safe-area insets and coordinate-space
// frames. named spaces and
// opaque anchor resolution need native value mappings and remain unsupported.
export interface GeometryProxySize {
  width: number
  height: number
}

export interface GeometryProxySafeAreaInsets {
  top: number
  leading: number
  bottom: number
  trailing: number
}

export interface GeometryProxyFrame {
  x: number
  y: number
  width: number
  height: number
}

export interface GeometryProxy {
  readonly size: GeometryProxySize
  readonly safeAreaInsets: GeometryProxySafeAreaInsets
  frame(coordinateSpace: 'global' | 'local'): GeometryProxyFrame
}

// ViewProps.children is ReactNode, which cannot hold the content closure, so
// the reader omits it and declares the closure instead.
export interface GeometryReaderProps extends Omit<ViewProps, 'children'> {
  swiftStyle?: OneNativeStyle
  children: (geometry: GeometryProxy) => ReactNode
}

// SwiftUI's TimelineSchedule values this binding drives: .everyMinute,
// .periodic(from:by:) with `by` in seconds, and .explicit(dates). native runs the
// schedule, so entries land when SwiftUI says they are due.
export type TimelineSchedule =
  | 'everyMinute'
  | { type: 'periodic'; from: Date; by: number }
  | { type: 'explicit'; dates: readonly Date[] }

// TimelineView.Context.Cadence: how often SwiftUI expects to refresh the content.
export const timelineCadences = ['live', 'seconds', 'minutes'] as const
export type TimelineCadence = (typeof timelineCadences)[number]

// the context SwiftUI passes the content closure for each schedule entry.
export interface TimelineViewContext {
  readonly date: Date
  readonly cadence: TimelineCadence
}

// ViewProps.children is ReactNode, which cannot hold the content closure, so the
// view omits it and declares the closure instead.
export interface TimelineViewProps extends Omit<ViewProps, 'children'> {
  swiftStyle?: OneNativeStyle
  schedule: TimelineSchedule
  children: (context: TimelineViewContext) => ReactNode
}

export interface OverlayProps extends ViewProps {
  alignment?: ZStackAlignment
  children: ReactNode
}

export interface OverlayContentProps extends ViewProps {
  children: ReactNode
}

export type ViewSlotProps = ViewProps & ViewSlotConfiguration & { children: ReactNode }

export interface SwipeActionsProps extends ViewProps {
  children: ReactNode
}

export interface SwipeActionsActionsProps extends ViewProps {
  edge?: SwipeActionsEdge
  allowsFullSwipe?: boolean
  children: ReactNode
}

export interface PageProps {
  id: string
  testID?: string
  children: ReactNode
}

export interface PagerProps extends ViewProps {
  selection: string
  indexDisplayMode?: SDKPageTabViewStyleIndexDisplayModeValue
  onSelectionChange: (id: string) => void
  revision?: number
  children: ReactNode
}
