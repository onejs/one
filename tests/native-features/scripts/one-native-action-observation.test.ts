import { expect, test } from 'bun:test'
import { nativeButton } from './one-native-conformance'

const testID = 'one-native-leaf-reject'
const status = {
  AXUniqueId: testID,
  AXLabel: 'Reject: off',
  type: 'StaticText',
  role: 'AXStaticText',
  frame: { x: 16, y: 246, width: 361, height: 13.333 },
}
const action = {
  AXUniqueId: testID,
  AXLabel: 'Reject edits',
  type: 'Button',
  role: 'AXButton',
  frame: { x: 10, y: 415.333, width: 85.667, height: 34 },
}

test('targets the actual native action through same-ID status text', () => {
  expect(nativeButton([status, action], testID)).toBe(action)
  expect(nativeButton([action, status], testID)).toBe(action)
})

test('rejects absent, wrong-role and wrong-identity actions', () => {
  expect(nativeButton([status], testID)).toBeUndefined()
  expect(nativeButton([{ ...action, role: 'AXStaticText' }], testID)).toBeUndefined()
  expect(nativeButton([{ ...action, type: 'StaticText' }], testID)).toBeUndefined()
  expect(nativeButton([{ ...action, AXUniqueId: 'other' }], testID)).toBeUndefined()
})

test('rejects competing actions even when their labels agree', () => {
  expect(
    nativeButton([action, { ...action, frame: { ...action.frame, y: 450 } }], testID)
  ).toBeUndefined()
})
