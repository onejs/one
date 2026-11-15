import { createElement, type ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, create } from 'react-test-renderer'
import { Swift as UnsupportedSwift } from '../src/platform/unsupported'
import type { OneNativeStyle } from '../src/platform/generated/controlTypes'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  NativeModules: {},
  processColor: (color: string) => ({ red: 4294901760, blue: 4278190335 })[color] ?? color,
  View: () => null,
  Text: () => null,
  Image: () => null,
  ScrollView: () => null,
  TextInput: () => null,
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => {
    // the animators compose their content, so the stub mounts it.
    const Stub = (props: { children?: unknown }) => props.children ?? null
    Stub.displayName = name
    return Stub
  },
}))

let Animators: typeof import('../src/platform/Animators.native')
let Keyframes: typeof import('../src/platform/keyframes')
let swiftStyleNative: typeof import('../src/platform/generated/swiftStyleNative').swiftStyleNative

beforeAll(async () => {
  Animators = await import('../src/platform/Animators.native')
  Keyframes = await import('../src/platform/keyframes')
  swiftStyleNative = (await import('../src/platform/generated/swiftStyleNative')).swiftStyleNative
})

const root = fileURLToPath(new URL('..', import.meta.url))
const schema = JSON.parse(readFileSync(root + 'schema.json', 'utf8'))

// a SwiftUI child: the animators only read its props.
function Box(_props: { swiftStyle?: OneNativeStyle; label?: string; onPress?: () => void; children?: ReactNode }) {
  return null
}
Box.displayName = 'Box'

function mount(element: ReturnType<typeof createElement>) {
  let renderer!: ReturnType<typeof create>
  act(() => {
    renderer = create(element)
  })
  return renderer
}

function stub(renderer: ReturnType<typeof create>, name: string) {
  return renderer.root.find((node) => (node.type as { displayName?: string })?.displayName === name)
}

function payloadOf(style: OneNativeStyle) {
  const native = swiftStyleNative(style) as { sdkModifiers?: string }
  const pairs = JSON.parse(native.sdkModifiers!) as [string, string][]
  const pair = pairs.find(([name]) => name === 'oneNativeAnimator')!
  return { native, pairs, payload: JSON.parse(pair[1]) }
}

describe('PhaseAnimator', () => {
  it('runs the content closure per phase and carries each phase style natively', () => {
    const onPress = vi.fn()
    const renderer = mount(
      <Animators.PhaseAnimator
        phases={[0, 1, 2]}
        animation={(phase) => phase === 2 ? null : phase === 1
          ? { kind: 'easeOut', duration: 0.75 }
          : 'snappy'}
      >
        {(phase) => (
          <Box
            label="box"
            onPress={phase === 0 ? onPress : () => {}}
            swiftStyle={{ opacity: 0.2 + phase * 0.4, width: 40 }}
          />
        )}
      </Animators.PhaseAnimator>
    )
    const native = stub(renderer, 'OneNativePhaseAnimator')
    expect(JSON.parse(native.props.animations)).toEqual([
      'snappy', '{"kind":"easeOut","duration":0.75}', null,
    ])
    expect(native.props.hasTrigger).toBe(false)
    const box = renderer.root.findByType(Box)
    // callbacks come from the first evaluation and visible fields are phase 0's.
    expect(box.props.onPress).toBe(onPress)
    expect(box.props.swiftStyle.opacity).toBeCloseTo(0.2)
    const { payload } = payloadOf(box.props.swiftStyle)
    expect(payload).toMatchObject({ id: native.props.animatorId, kind: 'phase', varying: ['opacity'] })
    expect(payload.phases.map((phase: { opacity: number }) => phase.opacity)).toEqual([
      0.2, 0.6000000000000001, 1,
    ])
  })

  it('leaves a style that does not change by phase as a plain style', () => {
    const renderer = mount(
      <Animators.PhaseAnimator phases={['a', 'b']}>
        {(phase) => <Box label={'same'} swiftStyle={{ opacity: 1 }}>{phase === 'a' ? null : null}</Box>}
      </Animators.PhaseAnimator>
    )
    const native = swiftStyleNative(renderer.root.findByType(Box).props.swiftStyle) as { sdkModifiers?: string }
    expect(native.sdkModifiers ?? '').not.toContain('oneNativeAnimator')
  })

  it('advances the trigger count only when the trigger changes', () => {
    const tree = (trigger: unknown) => (
      <Animators.PhaseAnimator phases={[0, 1]} trigger={trigger}>
        {(phase) => <Box swiftStyle={{ opacity: phase }} />}
      </Animators.PhaseAnimator>
    )
    const renderer = mount(tree('a'))
    const before = stub(renderer, 'OneNativePhaseAnimator').props
    expect(before.hasTrigger).toBe(true)
    act(() => renderer.update(tree('a')))
    expect(stub(renderer, 'OneNativePhaseAnimator').props.trigger).toBe(before.trigger)
    act(() => renderer.update(tree('b')))
    expect(stub(renderer, 'OneNativePhaseAnimator').props.trigger).toBe(before.trigger + 1)
    expect(stub(renderer, 'OneNativePhaseAnimator').props.animatorId).toBe(before.animatorId)
  })

  it('rejects content that is not a phase function, empty phases and unknown animations', () => {
    expect(() =>
      mount(<Animators.PhaseAnimator phases={[0]}>{(<Box />) as never}</Animators.PhaseAnimator>)
    ).toThrow('Swift.PhaseAnimator takes a content function of its phase')
    expect(() =>
      mount(<Animators.PhaseAnimator phases={[]}>{() => <Box />}</Animators.PhaseAnimator>)
    ).toThrow('Swift.PhaseAnimator phases must not be empty')
    expect(() =>
      mount(
        <Animators.PhaseAnimator phases={[0]} animation={() => 'wobble' as never}>
          {() => <Box />}
        </Animators.PhaseAnimator>
      )
    ).toThrow('Swift.PhaseAnimator animation must return null or one of')
  })

  it('rejects phase-dependent props other than swiftStyle and structural changes', () => {
    expect(() =>
      mount(
        <Animators.PhaseAnimator phases={[0, 1]}>
          {(phase) => <Box label={`phase ${phase}`} />}
        </Animators.PhaseAnimator>
      )
    ).toThrow('Swift.PhaseAnimator content can vary only swiftStyle by phase; Box.label changed')
    expect(() =>
      mount(
        <Animators.PhaseAnimator phases={[0, 1]}>
          {(phase) => (phase ? <Box /> : null)}
        </Animators.PhaseAnimator>
      )
    ).toThrow('Swift.PhaseAnimator content must render the same children for every phase')
  })

  it('rejects platform colors that change by phase', () => {
    const renderer = mount(
      <Animators.PhaseAnimator phases={[0, 1]}>
        {(phase) => <Box swiftStyle={{ foregroundStyle: phase ? 'red' : 'systemBlue' }} />}
      </Animators.PhaseAnimator>
    )
    expect(() => swiftStyleNative(renderer.root.findByType(Box).props.swiftStyle)).toThrow(
      'can vary foregroundStyle by phase only with plain colors'
    )
  })
})

describe('KeyframeAnimator', () => {
  it('sends field tracks and an affine style template', () => {
    const renderer = mount(
      <Animators.KeyframeAnimator
        initialValue={{ scale: 1, x: 0 }}
        keyframes={() => [
          Keyframes.KeyframeTrack('scale', [
            Keyframes.LinearKeyframe(2, { duration: 0.4, timingCurve: 'easeOut' }),
            Keyframes.SpringKeyframe(1, { spring: 'bouncy' }),
          ]),
          Keyframes.KeyframeTrack('x', [
            Keyframes.CubicKeyframe(30, { duration: 0.2 }),
            Keyframes.MoveKeyframe(0),
          ]),
        ]}
      >
        {(value) => (
          <Box
            swiftStyle={{
              width: 40 * value.scale + 10,
              offset: { x: value.x, y: 0 },
              opacity: 1,
            }}
          />
        )}
      </Animators.KeyframeAnimator>
    )
    const native = stub(renderer, 'OneNativeKeyframeAnimator')
    expect(JSON.parse(native.props.initialValue)).toEqual([1, 0])
    expect(native.props.repeating).toBe(true)
    expect(JSON.parse(native.props.tracks)).toEqual([
      {
        field: 0,
        keyframes: [
          { kind: 'linear', to: 2, duration: 0.4, timingCurve: { name: 'easeOut' } },
          { kind: 'spring', to: 1, spring: { kind: 'bouncy' } },
        ],
      },
      {
        field: 1,
        keyframes: [
          { kind: 'cubic', to: 30, duration: 0.2 },
          { kind: 'move', to: 0 },
        ],
      },
    ])
    const { payload } = payloadOf(renderer.root.findByType(Box).props.swiftStyle)
    expect(payload.kind).toBe('keyframe')
    const tokens = payload.tokens as { base: number; coefficients: number[] }[]
    const evaluate = (token: number, value: number[]) =>
      tokens[token].base + tokens[token].coefficients.reduce((sum, c, i) => sum + c * value[i], 0)
    // every varying number is rebuilt from the value per frame: the width from
    // a style field or template token, the offset x from a template token.
    expect(JSON.stringify(payload)).toMatch(/@@\d+@@/)
    expect(tokens.map((_, token) => evaluate(token, [1.5, 12])).sort((a, b) => a - b)).toEqual([12, 70])
  })

  it('splits whole-value keyframes into one track per field', () => {
    const renderer = mount(
      <Animators.KeyframeAnimator
        initialValue={{ a: 0, b: 1 }}
        trigger={1}
        keyframes={() => [Keyframes.LinearKeyframe({ a: 5, b: 6 }, { duration: 1 })]}
      >
        {(value) => <Box swiftStyle={{ opacity: value.a / 10 + value.b / 10 }} />}
      </Animators.KeyframeAnimator>
    )
    const native = stub(renderer, 'OneNativeKeyframeAnimator')
    expect(native.props.hasTrigger).toBe(true)
    expect(JSON.parse(native.props.tracks)).toEqual([
      { field: 0, keyframes: [{ kind: 'linear', to: 5, duration: 1 }] },
      { field: 1, keyframes: [{ kind: 'linear', to: 6, duration: 1 }] },
    ])
  })

  it('rejects content that is not linear in the value', () => {
    const renderer = mount(
      <Animators.KeyframeAnimator
        initialValue={1}
        keyframes={() => [Keyframes.LinearKeyframe(2, { duration: 1 })]}
      >
        {(value) => <Box swiftStyle={{ opacity: value * value }} />}
      </Animators.KeyframeAnimator>
    )
    expect(() => swiftStyleNative(renderer.root.findByType(Box).props.swiftStyle)).toThrow(
      'Swift.KeyframeAnimator content must map its value linearly to swiftStyle numbers; opacity does not'
    )
  })

  it('rejects keyframes that read their value, duplicate tracks and both repeating and trigger', () => {
    expect(() =>
      mount(
        <Animators.KeyframeAnimator
          initialValue={1}
          keyframes={(value) => [Keyframes.LinearKeyframe(value * 2, { duration: 1 })]}
        >
          {(value) => <Box swiftStyle={{ opacity: value }} />}
        </Animators.KeyframeAnimator>
      )
    ).toThrow('Swift.KeyframeAnimator keyframes must not depend on their value argument')
    expect(() =>
      mount(
        <Animators.KeyframeAnimator
          initialValue={{ a: 0 }}
          keyframes={() => [
            Keyframes.KeyframeTrack('a', [Keyframes.MoveKeyframe(1)]),
            Keyframes.KeyframeTrack('a', [Keyframes.MoveKeyframe(2)]),
          ]}
        >
          {(value) => <Box swiftStyle={{ opacity: value.a }} />}
        </Animators.KeyframeAnimator>
      )
    ).toThrow('animate a in more than one track')
    expect(() =>
      mount(
        <Animators.KeyframeAnimator
          initialValue={0}
          repeating
          trigger={1}
          keyframes={() => [Keyframes.MoveKeyframe(1)]}
        >
          {(value) => <Box swiftStyle={{ opacity: value }} />}
        </Animators.KeyframeAnimator>
      )
    ).toThrow('Swift.KeyframeAnimator takes repeating or trigger, not both')
  })

  it('rejects values with more fields than the native tracks and non-numeric fields', () => {
    const wide = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`f${i}`, 0]))
    expect(() =>
      mount(
        <Animators.KeyframeAnimator initialValue={wide} keyframes={() => []}>
          {() => <Box />}
        </Animators.KeyframeAnimator>
      )
    ).toThrow('supports at most 8 fields')
    expect(() =>
      mount(
        <Animators.KeyframeAnimator initialValue={{ a: Number.NaN }} keyframes={() => []}>
          {() => <Box />}
        </Animators.KeyframeAnimator>
      )
    ).toThrow('must be a finite number or a record of finite numbers')
  })

  it('rejects strings that follow the value', () => {
    expect(() =>
      mount(
        <Animators.KeyframeAnimator initialValue={0} keyframes={() => [Keyframes.MoveKeyframe(1)]}>
          {(value) => <Box label={`${value}`} />}
        </Animators.KeyframeAnimator>
      )
    ).toThrow('Swift.KeyframeAnimator content can vary only swiftStyle by value; Box.label changed')
  })
})

describe('animator registration', () => {
  it('is in the schema as composed containers', () => {
    for (const name of ['PhaseAnimator', 'KeyframeAnimator']) {
      const entry = schema.components.find((component: { publicName: string }) => component.publicName === name)
      expect(entry.layout).toEqual({ kind: 'container' })
      expect(entry.slots[0]).toMatchObject({ content: 'one-native', layout: 'composed' })
    }
  })

  it('throws without the native build', () => {
    expect(() => UnsupportedSwift.PhaseAnimator({ phases: [0], children: () => null })).toThrow(
      'Swift.PhaseAnimator requires an iOS native build'
    )
    expect(() =>
      UnsupportedSwift.KeyframeAnimator({ initialValue: 0, keyframes: () => [], children: () => null })
    ).toThrow('Swift.KeyframeAnimator requires an iOS native build')
  })
})
