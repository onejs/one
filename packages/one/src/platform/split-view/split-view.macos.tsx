// split view is ios-only; macOS renders the slot on its own like web, without
// pulling react-native-screens/experimental into the bundle

import type { ComponentType, ReactNode } from 'react'

export interface SplitViewColumnProps {
  children?: ReactNode
}

export interface SplitViewProps {
  children?: ReactNode
  slot?: ComponentType
}

function SplitViewNavigator({ slot: Slot }: SplitViewProps) {
  return Slot ? <Slot /> : null
}

function SplitViewColumnComponent(props: SplitViewColumnProps) {
  return <>{props.children}</>
}

export const SplitView = Object.assign(SplitViewNavigator, {
  Column: SplitViewColumnComponent,
  Inspector: SplitViewColumnComponent,
})
