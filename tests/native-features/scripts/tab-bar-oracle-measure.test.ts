// controls for the capsule measurement methods. these are not a unit test of the arithmetic:
// they are the cases where a method MUST fail, pinned so that a later change cannot quietly make
// it look like it works everywhere.
//
// the oracle has two ways to find the capsule's columns and neither works on both bars. which
// one runs is decided by measured contrast between the capsule interior and the background it is
// drawn on, never by an appearance flag, so these controls check the mechanism that decides as
// well as the methods themselves.
//
// run with `bun test scripts/tab-bar-oracle-measure.test.ts`. no simulator involved; the
// fixtures in oracle/controls are committed captures.
import { expect, test } from 'bun:test'
import path from 'node:path'
import {
  bandSurfaces,
  capsules,
  Capture,
  membershipSeeds,
  indicatorEdgesByStep,
  rimTrace,
  selectionIndicator,
  tabsInCapsule,
} from './tab-bar-oracle-measure'

const controls = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'oracle', 'controls')
const light = () => new Capture(path.join(controls, 'bar-light.png'))
const dark = () => new Capture(path.join(controls, 'bar-dark.png'))
// the dark bar floating over the list `More` presents, rather than over the fixture's page. the
// glass reads a few levels different over it, which is what the corner control below turns on.
const darkOverList = () => new Capture(path.join(controls, 'bar-dark-over-list.png'))

// the same bar, measured off both fixtures. the whole point of having a dark method is that this
// rect comes out the same, so it is what the controls are protecting.
const CAPSULE_WIDTH_PT = 351

test('negative control, dark: the rim trace finds the selected tab, not the capsule', () => {
  // the rim signature is a luminance trough followed by a spike, which exists only where the
  // capsule is brighter than what it sits on. on a dark bar the only thing in a column matching
  // it is the capsule interior followed by the selected tab's indicator, so the trace returns
  // the indicator's extent. this is the regression the dark control exists to catch: if someone
  // makes rimTrace appear to work here, it is reporting one tab and calling it the bar.
  const capture = dark()
  const rim = rimTrace(capture, 0, capture.width)
  expect(rim).not.toBeNull()
  const traced = rim!.right - rim!.left
  expect(traced).toBeLessThan(CAPSULE_WIDTH_PT / 2)

  // so the selector must not choose it here
  expect(bandSurfaces(capture).separation).toBeGreaterThanOrEqual(20)
  expect(capsules(capture)[0].seeding).toBe('membership')
})

test('negative control, light: membership cannot tell the capsule from its background', () => {
  // light glass sits about one level off the background behind it, which no colour membership
  // test can resolve. membership must not find the capsule here, and the selector must not ask
  // it to.
  const capture = light()
  const surfaces = bandSurfaces(capture)
  expect(surfaces.separation).toBeLessThan(20)

  const seeds = membershipSeeds(capture, surfaces)
  const foundTheCapsule = seeds.some((seed) => seed.right - seed.left > CAPSULE_WIDTH_PT * 0.9)
  expect(foundTheCapsule).toBe(false)

  expect(capsules(capture)[0].seeding).toBe('rim')
})

test('both methods land on the same capsule, and say what they checked', () => {
  const lightCapsule = capsules(light())[0]
  const darkCapsule = capsules(dark())[0]
  for (const measured of [lightCapsule, darkCapsule]) {
    expect(measured.rect.width).toBeCloseTo(CAPSULE_WIDTH_PT, 0)
    expect(measured.rect.x).toBeCloseTo(20.8, 0)
    expect(measured.rect.y).toBeCloseTo(769, 0)
  }
  // and the reduction in corroboration is recorded rather than hidden: where membership seeded,
  // the rim that would have checked left and right is the thing that does not exist.
  expect(lightCapsule.crossCheckedEdges).toEqual(['left', 'right', 'top'])
  expect(darkCapsule.crossCheckedEdges).toEqual([])
})

test('the selection indicator is found in both, and is one tab wide', () => {
  // the cutoff separating a second flat surface from ink is scaled to each capture's own range.
  // a fixed one tuned on the light bar rejected the dark indicator, and without an indicator
  // colour to exclude, every tab's pill counted as ink and segmentation collapsed to one slot.
  for (const capture of [light(), dark()]) {
    const capsule = capsules(capture)[0]
    const indicator = selectionIndicator(capture, capsule.rect, capsule.interior)
    expect(indicator).not.toBeNull()
    expect(indicator!.rect.width).toBeLessThan(CAPSULE_WIDTH_PT / 4)
    expect(indicator!.rect.x).toBeCloseTo(26, 0)

    const tabs = tabsInCapsule(capture, capsule.rect, [capsule.interior, indicator!.color])
    expect(tabs.length).toBe(5)
  }
})

test('negative control: the capsule corners are masked by shape, not by colour', () => {
  // a rectangular inset is not inside a pill. near the top and bottom rows the rounded end curves
  // away and the inset reaches past it onto whatever the bar is drawn on, and whether that
  // background then counts as ink depends on how far it happens to sit from the glass: 54 levels
  // over the fixture's page, 75 over the list, against an ink test of 70. so this capture, and
  // only this capture, reported seven tabs in a five tab bar.
  const capture = darkOverList()
  const capsule = capsules(capture)[0]
  const indicator = selectionIndicator(capture, capsule.rect, capsule.interior)
  const tabs = tabsInCapsule(capture, capsule.rect, [capsule.interior, indicator!.color])
  expect(tabs.length).toBe(5)

  // and the five are the same five the bar shows at rest, which is the thing a spurious cluster
  // at the capsule's end would move
  const centres = tabs.map((tab) => tab.glyphCenterX ?? tab.labelCenterX)
  expect(centres[0]).toBeCloseTo(61.7, 0)
  expect(centres[4]).toBeCloseTo(331.5, 0)
})

test('negative control: a translucent indicator read by its own colour moves when nothing does', () => {
  // the sweep frames are committed as bar bands, so their coordinates are the screen's less the
  // 700pt band origin. these four are two pairs: a resting frame and a scrolling frame from the
  // same sweep, in each appearance.
  const captures = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'oracle', 'captures')
  const band = { x: 59.8, y: 69, width: 274, height: 62 }
  const pairs = [
    ['tabs3-minautomatic-scroll-sweep-sel0-dark-00-rest', 'tabs3-minautomatic-scroll-sweep-sel0-dark-03-down'],
    ['tabs3-minonScrollDown-scroll-sweep-sel0-light-00-rest', 'tabs3-minonScrollDown-scroll-sweep-sel0-light-10-up'],
  ]
  for (const pair of pairs) {
    const readings = pair.map((name) => {
      const capture = new Capture(path.join(captures, name + '.png'))
      // the capsule interior, sampled in the gap between two tabs rather than found, because
      // capsules() reads absolute screen rows and these fixtures are bands
      const interior = capture.px(Math.round(170 * capture.scale), Math.round(100 * capture.scale))
      return {
        byColour: selectionIndicator(capture, band, interior)!.rect.height,
        byStep: indicatorEdgesByStep(capture, band, 110.7, 170)!,
      }
    })

    // the page passing behind tints the indicator's lower rows through the glass, so the colour
    // reading loses about a point off the bottom. nothing moved: this is the reading moving.
    expect(readings[0].byColour).not.toBeCloseTo(readings[1].byColour, 1)
    expect(Math.abs(readings[0].byColour - readings[1].byColour)).toBeLessThan(2)

    // the step to the capsule interior shares no part of that, and does not move
    expect(readings[0].byStep).toEqual(readings[1].byStep)
  }
})
