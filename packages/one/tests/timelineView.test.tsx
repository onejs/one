import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, create } from 'react-test-renderer'
import { Swift as UnsupportedSwift } from '../src/platform/unsupported'
import type { TimelineViewContext } from '../src/platform/groupTypes'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// same stub setup as mapControls.test.tsx. the reader reads hooks, so every
// case mounts through the renderer and drives the private native event the
// way the map suite drives its slot props.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  View: () => null,
  Text: () => null,
  Image: () => null,
  ScrollView: () => null,
  TextInput: () => null,
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => {
    const Stub = (_props: unknown) => null
    Stub.displayName = name
    return Stub
  },
}))

let Containers: typeof import('../src/platform/Containers.native')

beforeAll(async () => {
  Containers = await import('../src/platform/Containers.native')
})

const root = fileURLToPath(new URL('..', import.meta.url))
const schema = JSON.parse(readFileSync(root + 'schema.json', 'utf8'))
const metadata = JSON.parse(readFileSync(root + 'package.json', 'utf8'))
const component = (publicName: string) =>
  schema.components.find(
    (entry: { publicName: string }) => entry.publicName === publicName
  )

function stubOf(root: ReturnType<typeof create>, name: string) {
  return root.root.find(
    (node) => (node.type as { displayName?: string })?.displayName === name
  )
}

const monday = new Date('2026-10-12T09:00:00.000Z')

function renderTimeline(schedule: unknown, children: unknown) {
  let rendered: ReturnType<typeof create> | undefined
  act(() => {
    rendered = create(
      createElement(Containers.TimelineView, { schedule, children } as never) as never
    )
  })
  return rendered!
}

function fireTick(rendered: ReturnType<typeof create>, nativeEvent: unknown) {
  act(() => {
    stubOf(rendered, 'OneNativeTimelineView').props.onNativeTimelineViewTick({ nativeEvent })
  })
}

const group = () => createElement(Containers.Group, { children: null })

describe('timeline view', () => {
  it('waits for the first native entry before running the content closure', () => {
    const seen: TimelineViewContext[] = []
    const rendered = renderTimeline('everyMinute', (context: TimelineViewContext) => {
      seen.push(context)
      return group()
    })
    expect(seen).toEqual([])
    const native = stubOf(rendered, 'OneNativeTimelineView')
    expect(native.props.children.props.value).toBe(true)
    expect(native.props.children.props.children).toBeNull()
  })

  it('runs the content closure with the date and cadence each entry reports', () => {
    const seen: TimelineViewContext[] = []
    const rendered = renderTimeline('everyMinute', (context: TimelineViewContext) => {
      seen.push(context)
      return group()
    })
    fireTick(rendered, { time: monday.getTime(), cadence: 'minutes' })
    expect(seen).toHaveLength(1)
    expect(seen[0].date).toEqual(monday)
    expect(seen[0].cadence).toBe('minutes')
    fireTick(rendered, { time: monday.getTime() + 60000, cadence: 'live' })
    expect(seen).toHaveLength(2)
    expect(seen[1].date.getTime()).toBe(monday.getTime() + 60000)
    expect(seen[1].cadence).toBe('live')
    const native = stubOf(rendered, 'OneNativeTimelineView')
    expect(native.props.children.props.children.type).toBe(Containers.Group)
  })

  it('keeps state on a duplicate native entry', () => {
    const seen: TimelineViewContext[] = []
    const rendered = renderTimeline('everyMinute', (context: TimelineViewContext) => {
      seen.push(context)
      return group()
    })
    fireTick(rendered, { time: monday.getTime(), cadence: 'seconds' })
    fireTick(rendered, { time: monday.getTime(), cadence: 'seconds' })
    expect(seen).toHaveLength(1)
  })

  it('sends each schedule to native as its private props', () => {
    const props = (schedule: unknown) =>
      stubOf(renderTimeline(schedule, () => group()), 'OneNativeTimelineView').props
    expect(props('everyMinute')).toMatchObject({ schedule: 'everyMinute', dates: '[]' })
    expect(props({ type: 'periodic', from: monday, by: 30 })).toMatchObject({
      schedule: 'periodic',
      startDate: monday.getTime(),
      interval: 30,
    })
    const later = new Date(monday.getTime() + 3600000)
    expect(props({ type: 'explicit', dates: [monday, later] })).toMatchObject({
      schedule: 'explicit',
      dates: JSON.stringify([monday.getTime(), later.getTime()]),
    })
  })

  it('rejects an invalid schedule', () => {
    for (const [schedule, message] of [
      ['hourly', 'schedule must be'],
      [undefined, 'schedule must be'],
      [{ type: 'periodic', from: new Date(Number.NaN), by: 30 }, 'from must be a valid Date'],
      [{ type: 'periodic', from: monday, by: 0 }, 'by must be a positive number'],
      [{ type: 'explicit', dates: [monday, 'now'] }, 'dates must be an array of valid Dates'],
      [{ type: 'animation' }, 'schedule must be'],
    ] as const)
      expect(() => renderTimeline(schedule, () => group())).toThrow(message)
  })

  it('rejects an invalid native entry', () => {
    const rendered = renderTimeline('everyMinute', () => group())
    for (const nativeEvent of [
      null,
      { time: Number.NaN, cadence: 'live' },
      { time: monday.getTime(), cadence: 'hourly' },
      { cadence: 'live' },
    ])
      expect(() => fireTick(rendered, nativeEvent)).toThrow(
        'Swift.TimelineView emitted an invalid context'
      )
  })

  it('rejects static children, raw text, and a missing render function', () => {
    for (const children of [group(), 'sized', undefined])
      expect(() => renderTimeline('everyMinute', children)).toThrow(
        'Swift.TimelineView takes a render function of its context'
      )
  })

  it('rejects React Native content and raw text returned from the closure', async () => {
    const { View } = (await import('react-native')) as never as { View: () => null }
    const invalidView = renderTimeline('everyMinute', () => createElement(View))
    expect(() => fireTick(invalidView, { time: monday.getTime(), cadence: 'live' })).toThrow(
      'takes SwiftUI children'
    )
    const invalidText = renderTimeline('everyMinute', () => 'sized')
    expect(() => fireTick(invalidText, { time: monday.getTime(), cadence: 'live' })).toThrow(
      'not raw text'
    )
  })

  it('throws without the native build', () => {
    expect(
      () => (UnsupportedSwift as Record<string, (props: object) => unknown>).TimelineView({})
    ).toThrow('Swift.TimelineView requires an iOS native build')
  })
})

describe('timeline view schema', () => {
  it('carries the schedule props, the private tick event and the content slot', () => {
    expect(component('TimelineView').props).toMatchObject({
      schedule: { type: 'string' },
      startDate: { type: 'Double' },
      interval: { type: 'Double' },
      dates: { type: 'string' },
    })
    expect(component('TimelineView').events).toMatchObject({
      onNativeTimelineViewTick: { time: { type: 'Double' }, cadence: { type: 'string' } },
    })
    expect(component('TimelineView').layout).toMatchObject({ kind: 'measured' })
    expect(component('TimelineView').slots).toMatchObject([
      { name: 'content', content: 'one-native' },
    ])
    expect(component('TimelineView').interfaceOnly).toBe(true)
    expect(metadata.codegenConfig.ios.componentProvider.OneNativeTimelineView).toBe(
      'OneNativeTimelineViewComponentView'
    )
  })
})
