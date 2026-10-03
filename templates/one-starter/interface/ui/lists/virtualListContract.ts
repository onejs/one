import type { ComponentProps, ReactNode } from 'react'
import type Animated from 'react-native-reanimated'

type AnimatedViewProps = ComponentProps<typeof Animated.View>

// how a short list's rows move by layout: rows already there glide to their
// new places, and a row arriving comes in with them
export type RowMotion = {
  layout: NonNullable<AnimatedViewProps['layout']>
  entering: NonNullable<AnimatedViewProps['entering']>
  // how long a layout move runs. a list that has just overflowed keeps the
  // layout motion this long past its last content change, so a move in flight
  // finishes on the config that started it
  moveMs: number
}

export type VirtualRowProps = {
  children: ReactNode
  estimatedHeight: number
  nativeID?: string
  // native only: a list that carries row motion gives every row the same
  // animated wrapper for its whole life and varies only what it animates;
  // absent, the row has no animated wrapper at all.
  motion?: { layout?: RowMotion['layout']; entering?: RowMotion['entering'] }
}

export type ListSpacerProps = {
  height: number
  // the spacer stands in for rows after the mounted ones (a start-anchored
  // list) or before them (an end-anchored list).
  side: 'before' | 'after'
  // web: called with how many points of the spacer lie between its mounted
  // edge and two viewports past the visible area, whichever element scrolls.
  // native grows from scroll offsets instead and never calls it.
  onReach: (reach: number) => void
}
