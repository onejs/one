// these controls reject a container, missing field or competing editable controls.
import { expect, test } from 'bun:test'
import { nativeTextField } from './one-native-conformance'

const testID = 'one-native-focus-field-1'
const field = {
  AXUniqueId: testID,
  type: 'TextField',
  role: 'AXTextField',
  AXValue: 'F',
  frame: { x: 10, y: 330, width: 373, height: 34 },
}
const group = { AXUniqueId: testID, type: 'Group', role: 'AXGroup' }

test('reads the editable field value through its same-ID host', () => {
  expect(nativeTextField([group, field], testID)?.AXValue).toBe('F')
  expect(nativeTextField([field, group], testID)?.AXValue).toBe('F')
})

test('rejects absent, wrong-role and wrong-identity controls', () => {
  expect(nativeTextField([group], testID)).toBeUndefined()
  expect(nativeTextField([{ ...field, role: 'AXGroup' }], testID)).toBeUndefined()
  expect(nativeTextField([{ ...field, type: 'Group' }], testID)).toBeUndefined()
  expect(nativeTextField([{ ...field, AXUniqueId: 'other' }], testID)).toBeUndefined()
})

test('rejects competing fields even when their values agree', () => {
  expect(
    nativeTextField([field, { ...field, frame: { ...field.frame, y: 400 } }], testID)
  ).toBeUndefined()
  expect(nativeTextField([field, { ...field, AXValue: 'Other' }], testID)).toBeUndefined()
})
