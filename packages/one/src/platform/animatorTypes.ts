import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
import type { SDKAnimation } from './generated/controlTypes'

// SwiftUI PhaseAnimator(_:trigger:content:animation:) and
// PhaseAnimator(_:content:animation:). children is the content closure. Without
// trigger the animator cycles through phases for as long as it is visible;
// with one, each change (compared with Object.is) runs the phases once.
export interface PhaseAnimatorProps<Phase> extends Omit<ViewProps, 'children'> {
  phases: Iterable<Phase>
  trigger?: unknown
  // the animation into each phase, or null to change without animation.
  // SwiftUI's default is .default for every phase.
  animation?: (phase: Phase) => SDKAnimation | null
  children: (phase: Phase) => ReactNode
}

// the animated value: a number, or a record of up to eight numeric fields.
export type KeyframeValue = number | Readonly<Record<string, number>>

// SwiftUI UnitCurve: a static curve or .bezier(startControlPoint:endControlPoint:).
export const unitCurves = [
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'circularEaseIn',
  'circularEaseOut',
  'circularEaseInOut',
] as const
export type UnitCurve =
  | (typeof unitCurves)[number]
  | {
      startControlPoint: { x: number; y: number }
      endControlPoint: { x: number; y: number }
    }

// SwiftUI Spring: a static spring or one of its initializers.
export const springPresets = ['smooth', 'snappy', 'bouncy'] as const
export type Spring =
  | (typeof springPresets)[number]
  | { duration?: number; bounce?: number }
  | { mass?: number; stiffness: number; damping: number; allowOverDamping?: boolean }
  | { response: number; dampingRatio: number }
  | { settlingDuration: number; dampingRatio: number; epsilon?: number }

export type LinearKeyframe<Value extends KeyframeValue> = Readonly<{
  kind: 'linear'
  to: Value
  duration: number
  timingCurve?: UnitCurve
}>
export type SpringKeyframe<Value extends KeyframeValue> = Readonly<{
  kind: 'spring'
  to: Value
  duration?: number
  spring?: Spring
  startVelocity?: Value
}>
export type CubicKeyframe<Value extends KeyframeValue> = Readonly<{
  kind: 'cubic'
  to: Value
  duration: number
  startVelocity?: Value
  endVelocity?: Value
}>
export type MoveKeyframe<Value extends KeyframeValue> = Readonly<{ kind: 'move'; to: Value }>
export type Keyframe<Value extends KeyframeValue> =
  | LinearKeyframe<Value>
  | SpringKeyframe<Value>
  | CubicKeyframe<Value>
  | MoveKeyframe<Value>

// KeyframeTrack(keyPath) { ... }: keyPath names one field of a record value;
// without it the track animates the whole value.
export type KeyframeTrack<Value extends KeyframeValue> = Readonly<{
  kind: 'track'
  keyPath?: string
  content: readonly Keyframe<KeyframeValue>[]
}>

// SwiftUI KeyframeAnimator(initialValue:repeating:content:keyframes:) and
// KeyframeAnimator(initialValue:trigger:content:keyframes:). children is the
// content closure. keyframes returns tracks, or keyframes for the whole value.
export interface KeyframeAnimatorProps<Value extends KeyframeValue> extends Omit<ViewProps, 'children'> {
  initialValue: Value
  repeating?: boolean
  trigger?: unknown
  keyframes: (value: Value) => readonly KeyframeTrack<Value>[] | readonly Keyframe<Value>[]
  children: (value: Value) => ReactNode
}
