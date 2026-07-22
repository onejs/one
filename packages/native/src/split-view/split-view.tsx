import type { ComponentType, ReactNode } from 'react'

// split view is an ios-only container (react-native-screens gamma). on web the
// slot renders on its own, matching what the native version does off iOS.

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
