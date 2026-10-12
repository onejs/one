import { expect, test } from 'bun:test'
import { nativeSymbol } from './one-native-conformance'

const testID = 'one-native-leaf-image'
const symbol = {
  AXUniqueId: 'star.fill',
  type: 'Image',
  role: 'AXImage',
  frame: { x: 11.667, y: 338, width: 18.667, height: 18 },
  children: [],
}
const content = {
  AXUniqueId: testID,
  type: 'Image',
  role: 'AXImage',
  children: [symbol],
}
const group = { type: 'Group', role: 'AXGroup', children: [content] }
const host = {
  AXUniqueId: testID,
  type: 'Image',
  role: 'AXImage',
  children: [group],
  frame: { x: 10, y: 336.667, width: 373, height: 20.667 },
}

test('binds the symbol identity under its owner regardless of flattened node order', () => {
  expect(nativeSymbol([host, group, content, symbol], testID, 'star.fill')).toBe(symbol)
  expect(nativeSymbol([symbol, content, group, host], testID, 'star.fill')).toBe(symbol)
})

test('rejects missing, unrelated and wrong-role symbols', () => {
  for (const leaf of [
    { ...symbol, AXUniqueId: 'other' },
    { ...symbol, role: 'AXButton' },
    { ...symbol, type: 'Button' },
    { ...symbol, frame: undefined },
    { ...symbol, frame: { ...symbol.frame, width: 0 } },
  ]) {
    expect(
      nativeSymbol([{ ...content, children: [leaf] }], testID, 'star.fill')
    ).toBeUndefined()
  }
  expect(nativeSymbol([symbol], testID, 'star.fill')).toBeUndefined()
  expect(
    nativeSymbol([{ ...content, children: [] }, symbol], testID, 'star.fill')
  ).toBeUndefined()
  expect(
    nativeSymbol([{ ...host, role: 'AXButton' }], testID, 'star.fill')
  ).toBeUndefined()
})

test('rejects competing owners and sibling symbols or controls', () => {
  expect(nativeSymbol([host, { ...content }], testID, 'star.fill')).toBeUndefined()
  for (const sibling of [symbol, content, { type: 'Button', role: 'AXButton' }, group]) {
    expect(
      nativeSymbol([{ ...host, children: [group, sibling] }], testID, 'star.fill')
    ).toBeUndefined()
  }
})

test('uses the requested system name and rejects stale symbol identity', () => {
  const speaker = { ...symbol, AXUniqueId: 'speaker.wave.3' }
  const owner = { ...content, children: [speaker] }
  expect(nativeSymbol([owner, speaker], testID, 'speaker.wave.3')).toBe(speaker)
  expect(nativeSymbol([owner, speaker], testID, 'star.fill')).toBeUndefined()
})
