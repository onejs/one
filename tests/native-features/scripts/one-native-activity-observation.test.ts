import { expect, test } from 'bun:test'
import { nativeActivityCopy } from './one-native-conformance'

const frame = { x: 9, y: 449, width: 375, height: 394 }
const app = { type: 'Application', pid: 100 }
const sheet = {
  type: 'Group',
  enabled: true,
  pid: 100,
  AXUniqueId: 'ActivityListView',
  frame,
}
const remote = { ...sheet, AXUniqueId: 'ShareSheet.RemoteContainerView' }
const mounted = [app, sheet, remote]
const copy = {
  type: 'Button',
  role: 'AXButton',
  enabled: true,
  pid: 200,
  AXUniqueId: 'actionGroupCell',
  AXLabel: 'Copy',
  frame: { x: 18, y: 260, width: 82, height: 134 },
}
const actions = {
  type: 'ScrollArea',
  enabled: true,
  pid: 200,
  children: [copy, { ...copy, AXLabel: 'Save to Files' }],
}

test('resolves the enabled native Copy button in the mounted remote sheet', () => {
  expect(nativeActivityCopy(mounted, actions)?.frame).toEqual({
    ...copy.frame,
    x: 27,
    y: 709,
  })
})

test('an icon, tile group or text label cannot establish the Copy action', () => {
  for (const type of ['Image', 'Group', 'StaticText']) {
    expect(
      nativeActivityCopy(mounted, { ...actions, children: [{ ...copy, type }] })
    ).toBeUndefined()
  }
  expect(nativeActivityCopy(mounted, { ...actions, children: [] })).toBeUndefined()
  expect(
    nativeActivityCopy(mounted, { ...actions, children: [copy, copy] })
  ).toBeUndefined()
})

test('rejects an absent sheet, wrong window and disabled native action', () => {
  expect(nativeActivityCopy([app], actions)).toBeUndefined()
  expect(nativeActivityCopy([app, sheet], actions)).toBeUndefined()
  expect(nativeActivityCopy([app, sheet, remote, remote], actions)).toBeUndefined()
  expect(nativeActivityCopy(mounted, { ...actions, pid: app.pid })).toBeUndefined()
  expect(
    nativeActivityCopy(mounted, { ...actions, children: [{ ...copy, pid: 300 }] })
  ).toBeUndefined()
  expect(
    nativeActivityCopy(mounted, { ...actions, children: [{ ...copy, enabled: false }] })
  ).toBeUndefined()
})

test('rejects mismatched sheet bounds and controls outside the native container', () => {
  expect(
    nativeActivityCopy([app, sheet, { ...remote, frame: { ...frame, y: 0 } }], actions)
  ).toBeUndefined()
  expect(
    nativeActivityCopy(mounted, {
      ...actions,
      children: [{ ...copy, frame: { ...copy.frame, y: 400 } }],
    })
  ).toBeUndefined()
})
