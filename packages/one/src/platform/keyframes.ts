import type {
  CubicKeyframe as CubicKeyframeValue,
  Keyframe,
  KeyframeTrack as KeyframeTrackValue,
  KeyframeValue,
  LinearKeyframe as LinearKeyframeValue,
  MoveKeyframe as MoveKeyframeValue,
  Spring,
  SpringKeyframe as SpringKeyframeValue,
  UnitCurve,
} from './animatorTypes'

// SwiftUI's keyframe builders. each returns a description that
// KeyframeAnimator hands to the native keyframe timeline.

export function LinearKeyframe<Value extends KeyframeValue>(
  to: Value,
  options: { duration: number; timingCurve?: UnitCurve }
): LinearKeyframeValue<Value> {
  return { kind: 'linear', to, duration: options.duration, timingCurve: options.timingCurve }
}

export function SpringKeyframe<Value extends KeyframeValue>(
  to: Value,
  options: { duration?: number; spring?: Spring; startVelocity?: Value } = {}
): SpringKeyframeValue<Value> {
  return { kind: 'spring', to, ...options }
}

export function CubicKeyframe<Value extends KeyframeValue>(
  to: Value,
  options: { duration: number; startVelocity?: Value; endVelocity?: Value }
): CubicKeyframeValue<Value> {
  return { kind: 'cubic', to, ...options }
}

export function MoveKeyframe<Value extends KeyframeValue>(to: Value): MoveKeyframeValue<Value> {
  return { kind: 'move', to }
}

export function KeyframeTrack<Value extends KeyframeValue>(
  content: readonly Keyframe<KeyframeValue>[]
): KeyframeTrackValue<Value>
export function KeyframeTrack<Value extends KeyframeValue>(
  keyPath: string,
  content: readonly Keyframe<number>[]
): KeyframeTrackValue<Value>
export function KeyframeTrack<Value extends KeyframeValue>(
  keyPath: string | readonly Keyframe<KeyframeValue>[],
  content?: readonly Keyframe<KeyframeValue>[]
): KeyframeTrackValue<Value> {
  if (typeof keyPath === 'string') return { kind: 'track', keyPath, content: content ?? [] }
  return { kind: 'track', content: keyPath }
}
