import { expect, test } from 'bun:test'
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
