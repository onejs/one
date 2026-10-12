import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
import type { ZStackAlignment } from './generated/containerTypes'
import type { SFSymbolName } from './generated/sfSymbolNames'
import type { ControlGroupStyle } from './generated/swiftui'
import type { ViewSlotConfiguration } from './generated/viewSlots'

// hand-written round-2 container types, pending the container emitter (see
// listTypes.ts for round 1). they merge into src/generated/containerTypes.ts
// when the emitter carries these views.
export const swipeActionsEdges = ['leading', 'trailing'] as const
export type SwipeActionsEdge = (typeof swipeActionsEdges)[number]

export interface ControlGroupProps extends ViewProps {
  label?: string
  systemImage?: SFSymbolName | ''
  controlGroupStyle?: ControlGroupStyle
  children: ReactNode
}

export interface DisclosureGroupProps extends ViewProps {
  label: string
  isExpanded: boolean
  onIsExpandedChange: (isExpanded: boolean) => void
  revision?: number
  children: ReactNode
}

export type DividerProps = ViewProps

export interface LinkProps extends ViewProps {
  destination: string
  label?: string
  children?: ReactNode
}

export interface GroupProps extends ViewProps {
  children: ReactNode
}

export interface GroupBoxProps extends ViewProps {
  label?: string
  children?: ReactNode
}

export interface ViewThatFitsProps extends ViewProps {
  axes?: ViewThatFitsAxes
  children: ReactNode
}

export const viewThatFitsAxes = ['horizontal', 'vertical', 'both'] as const
export type ViewThatFitsAxes = (typeof viewThatFitsAxes)[number]

export interface GlassEffectContainerProps extends ViewProps {
  spacing?: number
  children: ReactNode
}

// the geometry SwiftUI proposes to a GeometryReader's content, in points. it
// mirrors GeometryProxy's bridgeable members: size is the reader's size,
// frame is its frame in global coordinates, and safeAreaInsets are its
// safe-area insets. frame(in:) with a local or named space, anchors,
// bounds(of:), and the iOS 26 and later corner, margin, and reserved-region
// APIs have no synchronous bridge path and are not represented here.
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

export interface GeometryProxySnapshot {
  readonly size: GeometryProxySize
  readonly safeAreaInsets: GeometryProxySafeAreaInsets
  readonly frame: GeometryProxyFrame
}

// ViewProps.children is ReactNode, which cannot hold the content closure, so
// the reader omits it and declares the closure instead.
export interface GeometryReaderProps extends Omit<ViewProps, 'children'> {
  children: (geometry: GeometryProxySnapshot) => ReactNode
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
  onSelectionChange: (id: string) => void
  revision?: number
  children: ReactNode
}
