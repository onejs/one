import type { ReactNode } from 'react'
import type { NativeSyntheticEvent, ViewProps } from 'react-native'

// edge inset and frame shapes shared by the native provider host and the
// react-native-safe-area-context-compatible context in one/safe-area-context.
// field semantics match UIEdgeInsets and CGRect, which the upstream
// EdgeInsets and Rect types already mirror, so no mapping layer sits
// between the native reading and the context value beyond the flat event.
export interface EdgeInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Metrics {
  insets: EdgeInsets
  frame: Rect
}

export type Edge = 'top' | 'right' | 'bottom' | 'left'
export type EdgeMode = 'off' | 'additive' | 'maximum'

export type EdgeRecord = Partial<Record<Edge, EdgeMode>>
export type Edges = readonly Edge[] | Readonly<EdgeRecord>

// flat native event payload. the provider emits eight scalars because
// generated event structs are flat; the adapter reshapes them into Metrics.
export interface NativeInsetsChangePayload {
  insetTop: number
  insetRight: number
  insetBottom: number
  insetLeft: number
  frameX: number
  frameY: number
  frameWidth: number
  frameHeight: number
}

export interface NativeSafeAreaProviderProps extends ViewProps {
  children?: ReactNode
  onNativeInsetsChange: (event: NativeSyntheticEvent<NativeInsetsChangePayload>) => void
}
