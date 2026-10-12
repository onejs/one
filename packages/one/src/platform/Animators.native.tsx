import {
  cloneElement,
  isValidElement,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { animatedSwiftStyle } from './animatorStyle'
import {
  springPresets,
  unitCurves,
  type Keyframe,
  type KeyframeAnimatorProps,
  type KeyframeTrack,
  type KeyframeValue,
  type PhaseAnimatorProps,
  type Spring,
  type UnitCurve,
} from './animatorTypes'
import { InsideContainer, assertOneNativeChildren } from './containerChildren'
import { sdkAnimationValues, type OneNativeStyle } from './generated/controlTypes'
import NativeKeyframeAnimator from './specs/OneNativeKeyframeAnimatorNativeComponent'
import NativePhaseAnimator from './specs/OneNativePhaseAnimatorNativeComponent'

// matches oneNativeKeyframeFieldLimit in OneNativeAnimators.swift.
const keyframeFieldLimit = 8

let nextAnimatorId = 1

function useAnimatorId() {
  const id = useRef(0)
  if (id.current === 0) id.current = nextAnimatorId++
  return id.current
}

// SwiftUI compares triggers with Equatable; JavaScript uses Object.is. native
// sees a counter that advances on every change.
function useTriggerCount(trigger: unknown) {
  const [state, setState] = useState({ trigger, count: 0 })
  if (Object.is(state.trigger, trigger)) return state.count
  const next = { trigger, count: (state.count + 1) % 0x7fffffff }
  setState(next)
  return next.count
}

function typeName(type: unknown) {
  if (typeof type === 'string') return type
  if (typeof type === 'function' || (typeof type === 'object' && type !== null)) {
    const named = type as { displayName?: string; name?: string }
    return named.displayName || named.name || 'a component'
  }
  return String(type)
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a === 'function' && typeof b === 'function') return true
  if (isValidElement(a) || isValidElement(b)) return false
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((item, index) => sameValue(item, b[index]))
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...keys].every((key) =>
      sameValue((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    )
  }
  return false
}

type Mark = (styles: (OneNativeStyle | undefined)[]) => OneNativeStyle

// the evaluations of one content closure become a single tree. they must agree
// on everything except swiftStyle; each differing swiftStyle becomes an animated
// style carrying all of its evaluations. callbacks come from the first
// evaluation, like any other prop that only differs by identity.
function zipContent(nodes: ReactNode[], owner: string, mark: Mark): ReactNode {
  const first = nodes[0]
  if (Array.isArray(first)) {
    if (!nodes.every((node) => Array.isArray(node) && node.length === first.length))
      throw new Error(`${owner} content must render the same children for every ${unit(owner)}`)
    return first.map((_, index) =>
      zipContent(
        nodes.map((node) => (node as ReactNode[])[index]),
        owner,
        mark
      )
    )
  }
  if (!isValidElement(first)) {
    if (!nodes.every((node) => sameValue(node, first)))
      throw new Error(`${owner} content must render the same children for every ${unit(owner)}`)
    return first
  }
  const elements = nodes as ReactElement<Record<string, unknown>>[]
  if (
    !elements.every(
      (node) => isValidElement(node) && node.type === first.type && node.key === first.key
    )
  )
    throw new Error(`${owner} content must render the same children for every ${unit(owner)}`)
  const props = first.props as Record<string, unknown>
  const keys = new Set(elements.flatMap((element) => Object.keys(element.props)))
  const next: Record<string, unknown> = {}
  for (const key of keys) {
    const values = elements.map((element) => element.props[key])
    if (key === 'children') {
      if (typeof values[0] === 'function') continue
      next.children = zipContent(values as ReactNode[], owner, mark)
    } else if (key === 'swiftStyle') {
      if (!values.every((value) => sameValue(value, values[0])))
        next.swiftStyle = mark(values as (OneNativeStyle | undefined)[])
    } else if (!values.every((value) => sameValue(value, values[0]))) {
      throw new Error(
        `${owner} content can vary only swiftStyle by ${unit(owner)}; ${typeName(first.type)}.${key} changed`
      )
    }
  }
  if (!('children' in next) && !('swiftStyle' in next)) return first
  return cloneElement(first, { ...props, ...next })
}

function unit(owner: string) {
  return owner === 'Swift.PhaseAnimator' ? 'phase' : 'value'
}

export function PhaseAnimator<Phase>({
  phases,
  trigger,
  animation,
  children,
  style,
  ...props
}: PhaseAnimatorProps<Phase>) {
  const id = useAnimatorId()
  const count = useTriggerCount(trigger)
  if (typeof children !== 'function')
    throw new Error('Swift.PhaseAnimator takes a content function of its phase; pass (phase) => content')
  if (phases === null || typeof phases !== 'object' || !(Symbol.iterator in phases))
    throw new Error('Swift.PhaseAnimator phases must be a sequence')
  const list = Array.from(phases)
  if (list.length === 0) throw new Error('Swift.PhaseAnimator phases must not be empty')
  if (animation !== undefined && typeof animation !== 'function')
    throw new Error('Swift.PhaseAnimator animation must be a function of the phase')
  const animations = list.map((phase) => {
    const value = animation ? animation(phase) : 'default'
    if (value !== null && !sdkAnimationValues.includes(value))
      throw new Error(
        `Swift.PhaseAnimator animation must return null or one of ${sdkAnimationValues.join(', ')}`
      )
    return value
  })
  const content = zipContent(
    list.map((phase) => children(phase)),
    'Swift.PhaseAnimator',
    (samples) => animatedSwiftStyle({ id, kind: 'phase', owner: 'Swift.PhaseAnimator', samples: samples.map((sample) => sample ?? {}) })
  )
  assertOneNativeChildren(content, 'Swift.PhaseAnimator')
  return (
    <NativePhaseAnimator
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      animatorId={id}
      animations={JSON.stringify(animations)}
      hasTrigger={trigger !== undefined}
      trigger={count}
    >
      <InsideContainer value={true}>{content}</InsideContainer>
    </NativePhaseAnimator>
  )
}

// a keyframe value as its ordered fields: a number is one field.
function valueFields(value: KeyframeValue, owner: string, what: string): string[] {
  const fields = typeof value === 'number' ? ['self'] : value && typeof value === 'object' ? Object.keys(value) : []
  const numbers = typeof value === 'number' ? [value] : fields.map((field) => (value as Record<string, unknown>)[field])
  if (fields.length === 0 || !numbers.every((item) => typeof item === 'number' && Number.isFinite(item)))
    throw new Error(`${owner} ${what} must be a finite number or a record of finite numbers`)
  if (fields.length > keyframeFieldLimit)
    throw new Error(`${owner} ${what} supports at most ${keyframeFieldLimit} fields`)
  return fields
}

function vectorOf(value: KeyframeValue, fields: string[], owner: string, what: string): number[] {
  if (typeof value === 'number' && fields.length === 1 && fields[0] === 'self') return [value]
  const actual = valueFields(value, owner, what)
  if (actual.length !== fields.length || !fields.every((field) => actual.includes(field)))
    throw new Error(`${owner} ${what} must have the fields ${fields.join(', ')}`)
  return fields.map((field) => (value as Record<string, number>)[field])
}

function valueFrom(vector: number[], fields: string[], scalar: boolean): KeyframeValue {
  return scalar ? vector[0] : Object.fromEntries(fields.map((field, index) => [field, vector[index]]))
}

function duration(value: unknown, owner: string, required: boolean) {
  if (value === undefined && !required) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new Error(`${owner} keyframe duration must be a finite, non-negative number`)
  return value
}

function curveOf(curve: UnitCurve | undefined, owner: string) {
  if (curve === undefined) return undefined
  if (typeof curve === 'string') {
    if (!unitCurves.includes(curve)) throw new Error(`${owner} timingCurve must be one of ${unitCurves.join(', ')} or a bezier`)
    return { name: curve }
  }
  const points = [curve?.startControlPoint, curve?.endControlPoint]
  if (!points.every((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y)))
    throw new Error(`${owner} bezier timingCurve needs finite startControlPoint and endControlPoint`)
  return {
    startControlPoint: [curve.startControlPoint.x, curve.startControlPoint.y],
    endControlPoint: [curve.endControlPoint.x, curve.endControlPoint.y],
  }
}

function springOf(spring: Spring | undefined, owner: string) {
  if (spring === undefined) return undefined
  const finite = (value: unknown) => value === undefined || (typeof value === 'number' && Number.isFinite(value))
  if (typeof spring === 'string') {
    if (!springPresets.includes(spring)) throw new Error(`${owner} spring must be one of ${springPresets.join(', ')} or a Spring initializer`)
    return { kind: spring }
  }
  const record = (spring ?? {}) as Record<string, unknown>
  if (!Object.values(record).every((value) => typeof value === 'boolean' || finite(value)))
    throw new Error(`${owner} spring values must be finite numbers`)
  if ('stiffness' in record || 'damping' in record || 'mass' in record) {
    if (record.stiffness === undefined || record.damping === undefined)
      throw new Error(`${owner} spring needs stiffness and damping`)
    return { kind: 'physical', ...record }
  }
  if ('settlingDuration' in record) {
    if (record.dampingRatio === undefined) throw new Error(`${owner} spring needs dampingRatio`)
    return { kind: 'settling', ...record }
  }
  if ('response' in record) {
    if (record.dampingRatio === undefined) throw new Error(`${owner} spring needs dampingRatio`)
    return { kind: 'response', ...record }
  }
  return { kind: 'duration', ...record }
}

type NativeKeyframe = Record<string, unknown> & { kind: string; to: number }

// one keyframe for one field. a whole-value keyframe splits into one per field,
// which is how SwiftUI interpolates a vector value component by component.
function nativeKeyframe(frame: Keyframe<KeyframeValue>, field: number, read: (value: KeyframeValue, what: string) => number[], owner: string): NativeKeyframe {
  const pick = (value: KeyframeValue | undefined, what: string) =>
    value === undefined ? undefined : read(value, what)[field]
  switch (frame?.kind) {
    case 'linear':
      return { kind: 'linear', to: pick(frame.to, 'LinearKeyframe value')!, duration: duration(frame.duration, owner, true), timingCurve: curveOf(frame.timingCurve, owner) }
    case 'spring':
      return { kind: 'spring', to: pick(frame.to, 'SpringKeyframe value')!, duration: duration(frame.duration, owner, false), spring: springOf(frame.spring, owner), startVelocity: pick(frame.startVelocity, 'SpringKeyframe startVelocity') }
    case 'cubic':
      return { kind: 'cubic', to: pick(frame.to, 'CubicKeyframe value')!, duration: duration(frame.duration, owner, true), startVelocity: pick(frame.startVelocity, 'CubicKeyframe startVelocity'), endVelocity: pick(frame.endVelocity, 'CubicKeyframe endVelocity') }
    case 'move':
      return { kind: 'move', to: pick(frame.to, 'MoveKeyframe value')! }
    default:
      throw new Error(`${owner} keyframes must be LinearKeyframe, SpringKeyframe, CubicKeyframe or MoveKeyframe`)
  }
}

function nativeTracks(
  result: readonly KeyframeTrack<KeyframeValue>[] | readonly Keyframe<KeyframeValue>[],
  fields: string[],
  scalar: boolean,
  owner: string
) {
  if (!Array.isArray(result)) throw new Error(`${owner} keyframes must return an array of tracks or keyframes`)
  const tracks = result.every((item) => item?.kind === 'track')
    ? (result as readonly KeyframeTrack<KeyframeValue>[])
    : [{ kind: 'track' as const, content: result as readonly Keyframe<KeyframeValue>[] }]
  const byField = new Map<number, NativeKeyframe[]>()
  const add = (field: number, frames: NativeKeyframe[]) => {
    if (byField.has(field))
      throw new Error(`${owner} keyframes animate ${fields[field]} in more than one track; one track per field is bridged`)
    byField.set(field, frames)
  }
  for (const track of tracks) {
    if (track?.kind !== 'track' || !Array.isArray(track.content))
      throw new Error(`${owner} keyframes must not mix tracks and keyframes`)
    if (track.keyPath === undefined) {
      const read = (value: KeyframeValue, what: string) => vectorOf(value, fields, owner, what)
      fields.forEach((_, field) => add(field, track.content.map((frame) => nativeKeyframe(frame, field, read, owner))))
    } else {
      const field = scalar ? -1 : fields.indexOf(track.keyPath)
      if (field < 0) throw new Error(`${owner} KeyframeTrack keyPath ${track.keyPath} is not a field of the value`)
      const read = (value: KeyframeValue, what: string) => {
        if (typeof value !== 'number' || !Number.isFinite(value))
          throw new Error(`${owner} ${what} on ${track.keyPath} must be a finite number`)
        return fields.map(() => value)
      }
      add(field, track.content.map((frame) => nativeKeyframe(frame, field, read, owner)))
    }
  }
  return [...byField].map(([field, keyframes]) => ({ field, keyframes }))
}

export function KeyframeAnimator<Value extends KeyframeValue>({
  initialValue,
  repeating,
  trigger,
  keyframes,
  children,
  style,
  ...props
}: KeyframeAnimatorProps<Value>) {
  const owner = 'Swift.KeyframeAnimator'
  const id = useAnimatorId()
  const count = useTriggerCount(trigger)
  if (typeof children !== 'function')
    throw new Error(`${owner} takes a content function of its value; pass (value) => content`)
  if (typeof keyframes !== 'function') throw new Error(`${owner} keyframes must be a function of the value`)
  if (trigger !== undefined && repeating !== undefined)
    throw new Error(`${owner} takes repeating or trigger, not both`)
  if (repeating !== undefined && typeof repeating !== 'boolean') throw new Error(`${owner} repeating must be a boolean`)
  const scalar = typeof initialValue === 'number'
  const fields = valueFields(initialValue, owner, 'initialValue')
  const initial = vectorOf(initialValue, fields, owner, 'initialValue')
  // content runs at the initial value, one unit step per field, and a check
  // point that proves the style follows the value linearly.
  const samples = [
    initial,
    ...fields.map((_, field) => initial.map((value, index) => (index === field ? value + 1 : value))),
    initial.map((value, index) => value + 0.37 * (index + 1) + 0.25),
  ]
  const tracks = nativeTracks(keyframes(initialValue), fields, scalar, owner)
  const checkTracks = nativeTracks(keyframes(valueFrom(samples.at(-1)!, fields, scalar) as Value), fields, scalar, owner)
  if (JSON.stringify(tracks) !== JSON.stringify(checkTracks))
    throw new Error(`${owner} keyframes must not depend on their value argument; it is not bridged`)
  const content = zipContent(
    samples.map((vector) => children(valueFrom(vector, fields, scalar) as Value)),
    owner,
    (styles) => animatedSwiftStyle({ id, kind: 'keyframe', owner, samples: styles.map((sample) => sample ?? {}), values: samples })
  )
  assertOneNativeChildren(content, owner)
  return (
    <NativeKeyframeAnimator
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      animatorId={id}
      initialValue={JSON.stringify(initial)}
      tracks={JSON.stringify(tracks)}
      repeating={repeating ?? true}
      hasTrigger={trigger !== undefined}
      trigger={count}
    >
      <InsideContainer value={true}>{content}</InsideContainer>
    </NativeKeyframeAnimator>
  )
}
