import { expect, test } from 'bun:test'
import { alertRollbackObserved } from './one-native-dialog-observation'

const presented = {
  kind: 'appeared',
  controller: 'card',
  class: 'SwiftUI.PlatformAlertController',
  title: 'One Native Alert',
  live: true,
}
const opened = {
  kind: 'configure',
  host: 'host',
  value: true,
  acknowledged: 2,
  revision: 0,
}
const closed = { kind: 'disappeared', controller: 'card' }
const action = { kind: 'action', id: 'cancel', presenting: 'alert-item', count: 3 }
const change = { kind: 'change', value: false, count: 3, revision: 0 }
const acknowledged = { ...opened, acknowledged: 3 }
const sequence = [opened, presented, closed, action, change, acknowledged, presented]

test('requires the native callback, acknowledgement and live controller reappearance', () => {
  expect(alertRollbackObserved(sequence)).toBe(true)
  for (const missing of [closed, action, change, acknowledged]) {
    expect(alertRollbackObserved(sequence.filter((event) => event !== missing))).toBe(
      false
    )
  }
  expect(alertRollbackObserved(sequence.slice(0, -1))).toBe(false)
})

test('rejects stale presentation, another host/controller and contradictory events', () => {
  expect(
    alertRollbackObserved([...sequence.slice(0, -1), { ...presented, live: false }])
  ).toBe(false)
  expect(
    alertRollbackObserved([
      ...sequence.slice(0, -1),
      { ...presented, controller: 'other' },
    ])
  ).toBe(false)
  expect(
    alertRollbackObserved(
      sequence.map((event) =>
        event === acknowledged ? { ...event, host: 'other' } : event
      )
    )
  ).toBe(false)
  expect(alertRollbackObserved([...sequence, { ...acknowledged, value: false }])).toBe(
    false
  )
  expect(alertRollbackObserved([...sequence, closed])).toBe(false)
  expect(alertRollbackObserved([...sequence, action])).toBe(false)
  expect(alertRollbackObserved([...sequence, change])).toBe(false)
  expect(alertRollbackObserved([...sequence, { error: 'probe failed' }])).toBe(false)
})

test('rejects an acknowledgement preceding its callback or using another revision', () => {
  expect(
    alertRollbackObserved([
      opened,
      presented,
      closed,
      action,
      acknowledged,
      change,
      presented,
    ])
  ).toBe(false)
  expect(
    alertRollbackObserved(
      sequence.map((event) => (event === change ? { ...event, revision: 1 } : event))
    )
  ).toBe(false)
  expect(
    alertRollbackObserved(
      sequence.map((event) =>
        event === acknowledged ? { ...event, acknowledged: 2 } : event
      )
    )
  ).toBe(false)
})
