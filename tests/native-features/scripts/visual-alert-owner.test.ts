import { expect, test } from 'bun:test'
import { PNG } from 'pngjs'
import { resolveVisualRegion, VISUAL_CHECKS } from './visual-declarations'

const declaration = VISUAL_CHECKS.find((check) => check.name === 'alert-dialog')!
const frame = { x: 67, y: 318, width: 260, height: 20 }
const title = {
  AXLabel: 'One Native Alert',
  type: 'StaticText',
  role: 'AXStaticText',
  frame,
}
const sheet = {
  AXLabel: title.AXLabel,
  type: 'Sheet',
  role: 'AXSheet',
  frame: { x: 37, y: 296, width: 320, height: 284 },
  children: [{ type: 'Group', children: [title] }],
}

test('title owns the unchanged crop within its native alert sheet', () => {
  expect(resolveVisualRegion(declaration, [sheet, title])).toEqual({
    x: 19,
    y: 309,
    width: 356,
    height: 60,
  })
  expect(resolveVisualRegion(declaration, [sheet, sheet, title])).toEqual(
    resolveVisualRegion(declaration, [sheet])
  )
})

test('rejects absent, wrong-role and wrong-owner titles', () => {
  for (const nodes of [
    [title],
    [{ ...sheet, children: [] }, title],
    [{ ...sheet, role: 'AXGroup' }],
    [{ ...sheet, AXLabel: 'Other Alert' }],
    [{ ...sheet, children: [{ ...title, role: 'AXButton' }] }],
    [{ ...sheet, children: [{ ...title, type: 'Group' }] }],
  ])
    expect(() => resolveVisualRegion(declaration, nodes)).toThrow('expected one framed')
})

test('rejects competing title frames within the alert owner', () => {
  expect(() =>
    resolveVisualRegion(declaration, [
      {
        ...sheet,
        children: [title, { ...title, frame: { ...frame, y: 350 } }],
      },
    ])
  ).toThrow('differing frames')
})

const confirmation = VISUAL_CHECKS.find((check) => check.name === 'confirmation-title')!
const confirmationTitle = {
  ...title,
  AXLabel: 'One Native Confirmation',
  frame: { x: 83, y: 278, width: 180, height: 42.3333333333 },
}
const confirmationSheet = {
  ...sheet,
  AXLabel: confirmationTitle.AXLabel,
  frame: { x: 53, y: 256, width: 240, height: 214.3333333333 },
  children: [{ type: 'Group', children: [confirmationTitle] }],
}

test('confirmation title owns the original 90 by 12 crop under its sheet', () => {
  expect(resolveVisualRegion(confirmation, [confirmationSheet, confirmationTitle])).toEqual({
    x: 83,
    y: 278,
    width: 90,
    height: 12,
  })
  expect(resolveVisualRegion(confirmation, [confirmationSheet, confirmationSheet])).toEqual(
    resolveVisualRegion(confirmation, [confirmationSheet])
  )
})

test('confirmation rejects absent, wrong-role and wrong-owner titles', () => {
  for (const nodes of [
    [confirmationTitle],
    [{ ...confirmationSheet, children: [] }, confirmationTitle],
    [{ ...confirmationSheet, role: 'AXGroup' }],
    [{ ...confirmationSheet, type: 'Group' }],
    [{ ...confirmationSheet, AXLabel: 'Other Confirmation' }],
    [{ ...confirmationSheet, children: [{ ...confirmationTitle, role: 'AXButton' }] }],
    [{ ...confirmationSheet, children: [{ ...confirmationTitle, type: 'Group' }] }],
  ])
    expect(() => resolveVisualRegion(confirmation, nodes)).toThrow('expected one framed')
})

test('confirmation rejects competing title frames within its sheet', () => {
  expect(() =>
    resolveVisualRegion(confirmation, [{
      ...confirmationSheet,
      children: [confirmationTitle, {
        ...confirmationTitle,
        frame: { ...confirmationTitle.frame, y: 310 },
      }],
    }])
  ).toThrow('differing frames')
})

test('confirmation rejects card-only, ink-only and neutral shape substitutes', () => {
  for (const color of [[251, 251, 253], [0, 0, 0], [255, 255, 255]]) {
    const crop = new PNG({ width: 270, height: 36 })
    for (let i = 0; i < crop.data.length; i += 4) {
      crop.data.set([...color, 255], i)
    }
    expect(confirmation.measureSubject(crop)).toBeLessThan(confirmation.minSubjectFloor)
  }
  const shape = new PNG({ width: 270, height: 36 })
  for (let y = 0; y < shape.height; y++) {
    for (let x = 0; x < shape.width; x++) {
      const inside = x >= 60 && x < 210 && y >= 8 && y < 28
      shape.data.set(inside ? [0, 0, 0, 255] : [235, 235, 235, 255], (y * shape.width + x) * 4)
    }
  }
  expect(confirmation.measureSubject(shape)).toBeLessThan(confirmation.minSubjectFloor)
})
