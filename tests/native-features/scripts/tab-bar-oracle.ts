#!/usr/bin/env bun
// walks the tab bar geometry matrix on a real simulator and writes the measured table.
//
//   bun tests/native-features/scripts/tab-bar-oracle.ts --simulator-id <UUID> --bundle-id <ID>
//
// one capture per cell, one JSON object per cell, both keyed by the cell id in
// tab-bar-oracle-cells.ts. the driver never taps the tab bar itself: a cell's selection is
// mounted by the fixture, so nothing here depends on where a tab happens to be.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { readPng, saveCrop } from './visual-pixel-gate'
import { cells, type OracleCell } from '../fixtures/tab-bar-oracle-cells'
import {
  Capture,
  capsules,
  pageContentBottom,
  overflowList,
  selectionIndicator,
  tabsInCapsule,
  SCREEN_PT,
  type Box,
} from './tab-bar-oracle-measure'

type Node = {
  AXLabel?: string
  AXUniqueId?: string
  type?: string
  frame?: { x: number; y: number; width: number; height: number }
  [key: string]: unknown
}

const args = process.argv.slice(2)
const arg = (name: string, fallback = '') => {
  const index = args.indexOf(name)
  return index >= 0 ? (args[index + 1] ?? fallback) : fallback
}
const simulatorId = arg('--simulator-id')
const bundleId = arg('--bundle-id', 'dev.one.native.tests')
// absolute, because the screenshots are written by a separate simctl process and a relative path
// would be resolved against whatever directory that process happens to start in. the default is
// anchored to this script rather than to cwd, because a driver run from tests/native-features
// instead of the repo root used to silently write a second, nested oracle tree no merge looks at.
const outDir = path.resolve(arg('--out', path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'oracle')))
// a comma separated list of cell ids, so a block of the matrix can be re-measured without
// re-running the cells beside it
const only = arg('--only')
// merge the measured cells into the table already on disk instead of replacing it. cells keep
// the order of the matrix, so a merged table is byte-comparable with a full run.
const merge = args.includes('--merge')
// re-derive the table from captures already on disk. the measurement code changes more often
// than the fixture does, and a re-measure that cannot re-capture also cannot quietly pick up a
// different app state halfway through.
const fromCaptures = args.includes('--from-captures')
if (!simulatorId) throw new Error('--simulator-id is required')

// the table is measured from the full 393x852 capture; what gets committed beside it is the
// bar band alone, which is the only part any number comes from and a tenth of the bytes.
const tablePath = path.join(outDir, 'tab-bar-geometry.json')
const capturesDir = path.join(outDir, 'captures')
const fullDir = path.join(outDir, 'full')
const BAND_TOP_PT = 700
fs.mkdirSync(capturesDir, { recursive: true })
fs.mkdirSync(fullDir, { recursive: true })

const mcp = (parts: string[]) =>
  execFileSync('xcodebuildmcp', [...parts, '--simulator-id', simulatorId], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000,
  })

function snapshot(): Node[] {
  const output = mcp(['simulator', 'snapshot-ui'])
  const json = output.match(/```json\s*([\s\S]*?)```/)?.[1] || output
  const nodes: Node[] = []
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(visit)
    if (!value || typeof value !== 'object') return
    const node = value as Node
    if (node.AXLabel || node.AXUniqueId || node.type || node.frame) nodes.push(node)
    Object.values(node).forEach(visit)
  }
  visit(JSON.parse(json))
  return nodes
}

const labels = (nodes: Node[]) => nodes.flatMap((n) => (n.AXLabel ? [n.AXLabel] : []))
const byId = (nodes: Node[], value: string) => nodes.find((n) => n.AXUniqueId === value)

async function waitFor(name: string, predicate: (nodes: Node[]) => boolean, timeout = 20_000) {
  const deadline = Date.now() + timeout
  let nodes: Node[] = []
  do {
    nodes = snapshot()
    if (predicate(nodes)) return nodes
    await Bun.sleep(200)
  } while (Date.now() < deadline)
  fs.writeFileSync(path.join(outDir, 'fail-snapshot.json'), JSON.stringify(nodes, null, 2))
  throw new Error(`${name} timed out after ${timeout}ms`)
}

const screenshot = (target: string) =>
  execFileSync('xcrun', ['simctl', 'io', simulatorId, 'screenshot', '--type=png', target], {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  })

/**
 * a capture is only usable once the bar has stopped moving. independent variable: the bar band
 * of two captures 400ms apart. a null result (never settling) proves an animation is still
 * running, which is exactly the state that would put a wrong number in the table.
 */
// a capture only has to be still where it is going to be measured. two rows matter:
//
//   BAR_TOP_PT      a bar capture is read from 500pt down: the page/bar boundary from 500, the
//                   capsules and their ink from 700. above that sit the system status bar, the
//                   router's header, and the fixture's own caption, none of which is measured
//                   and all of which repaint on their own. the caption in particular re-lays
//                   its text a subpixel at a time on the cells whose axis name wraps to two
//                   lines, so a whole-screen guard never converges on exactly those cells.
//   OVERFLOW_TOP_PT an overflow capture is read from 110pt down, because the list it measures
//                   starts just under the navigation bar. the fixture's caption is not in that
//                   capture at all: the list is drawn over it.
// iOS draws four tabs plus More once a Tabs has more than five, so everything from the fifth tab
// onward is what the overflow destination lists. MEASURED, not assumed: tabs6 lists Fifth/Sixth,
// tabs7 lists Fifth/Sixth/Seventh, and tabs5+search lists Fifth/Search.
/**
 * whether two bar readings may be compared slot for slot. a reading is only usable here if its
 * resting capsule was separated from the background by both methods, and if it found the full
 * five slots: a collapsed segmentation yields the same short list every time, so comparing two
 * of them proves nothing.
 */
function slotsComparable(a: ReturnType<typeof measure>, b: ReturnType<typeof measure>) {
  const full = (m: ReturnType<typeof measure>) =>
    m.tabCentersPt.length === VISIBLE_SLOTS_BEFORE_MORE + 1 &&
    m.tabCentersPt.every((value) => value !== null)
  return full(a) && full(b)
}

const VISIBLE_SLOTS_BEFORE_MORE = 4

const BAR_TOP_PT = 500
const OVERFLOW_TOP_PT = 110

// the capsule is a translucent glass material, and its compositing dithers: two captures of a
// screen that has not moved at all still disagree on a handful of single pixels by one or two
// levels, so bit equality over half a million pixels is a bar a still screen cannot clear. a
// pixel counts as moving only when a channel shifts by more than this. anything actually in
// motion moves edges by tens of levels across thousands of pixels, so nothing real hides under
// it, and the error below reports the largest shift seen so a rising floor would be visible.
const DITHER_LEVELS = 2

/** pixels moving between two captures below `fromPt`, with the region they sit in. */
function movement(a: string, b: string, fromPt: number) {
  const first = readPng(a)
  const second = readPng(b)
  const scale = first.width / SCREEN_PT.width
  let changed = 0
  let worst = 0
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1
  for (let y = Math.round(fromPt * scale); y < first.height; y++)
    for (let x = 0; x < first.width; x++) {
      const i = (y * first.width + x) * 4
      const delta = Math.max(
        Math.abs(first.data[i] - second.data[i]),
        Math.abs(first.data[i + 1] - second.data[i + 1]),
        Math.abs(first.data[i + 2] - second.data[i + 2])
      )
      if (delta > worst) worst = delta
      if (delta <= DITHER_LEVELS) continue
      changed++
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
  const pt = (value: number) => Math.round((value / scale) * 10) / 10
  return {
    changed,
    worst,
    where: changed
      ? `x ${pt(minX)}..${pt(maxX + 1)}, y ${pt(minY)}..${pt(maxY + 1)}pt`
      : 'nowhere',
  }
}

// the dev client polls /_expo/status, this server answers 404, and it flashes a "Refreshing..."
// banner that shoves the whole screen down for a moment. it recurs about once a second, so a
// capture has to wait for a gap between flashes. the bar it has to clear is unchanged, 400ms of
// no movement in the measured region; only the patience is longer.
const SETTLE_ATTEMPTS = 45

async function settledCapture(target: string, fromPt = BAR_TOP_PT) {
  const probe = path.join(outDir, 'settle.png')
  for (let attempt = 0; attempt < SETTLE_ATTEMPTS; attempt++) {
    screenshot(probe)
    await Bun.sleep(400)
    screenshot(target)
    if (movement(probe, target, fromPt).changed === 0) {
      fs.rmSync(probe, { force: true })
      return
    }
  }
  // saying only that it never settled leaves the next person guessing which part of the screen
  // was still moving, and the answer is usually a small region with a name: an animating push,
  // a caret, a bar still collapsing. so report where.
  const still = movement(probe, target, fromPt)
  throw new Error(
    `the screen never settled for ${target}: ${still.changed} pixels moved by more than ${DITHER_LEVELS} levels over 400ms below ${fromPt}pt, inside ${still.where}; largest shift ${still.worst} levels`
  )
}

/**
 * switching appearance is the one axis in this matrix whose setting is applied by something
 * other than the fixture, and `simctl ui ... appearance` reports success whether or not the
 * device acts on it: a device booted without waiting for bootstatus comes up reporting "dark"
 * while every pixel stays light. a dark cell captured in that state is a light cell wearing a
 * dark id, and a table full of them says appearance changes nothing, which is the conclusion
 * the axis exists to test. so the switch is verified in pixels: the screen before and the
 * screen after must differ. a null result here proves the device is ignoring the setting, and
 * the fix is a full `simctl shutdown` plus `boot` plus `bootstatus -b`, not a retry.
 */
async function setAppearance(mode: 'light' | 'dark') {
  // asking for the mode the device is already in repaints nothing, and that is not a failure.
  // the check below is about a mode CHANGE that fails to land, so read the device first.
  const current = execFileSync('xcrun', ['simctl', 'ui', simulatorId, 'appearance'], {
    encoding: 'utf8',
    timeout: 30_000,
  }).trim()
  if (current === mode) return
  const before = path.join(outDir, 'appearance-before.png')
  const after = path.join(outDir, 'appearance-after.png')
  screenshot(before)
  execFileSync('xcrun', ['simctl', 'ui', simulatorId, 'appearance', mode], {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  })
  for (let attempt = 0; attempt < 10; attempt++) {
    await Bun.sleep(800)
    screenshot(after)
    // "any pixel changed" is too weak to be a check: the system status bar repaints on its own
    // and would pass it while the app underneath stayed light. a real appearance change
    // repaints most of the screen, so the bar is a share of the whole screen.
    const first = readPng(before)
    const second = readPng(after)
    let changed = 0
    for (let i = 0; i < first.data.length; i += 4)
      if (
        first.data[i] !== second.data[i] ||
        first.data[i + 1] !== second.data[i + 1] ||
        first.data[i + 2] !== second.data[i + 2]
      )
        changed++
    if (changed / (first.data.length / 4) > 0.2) {
      fs.rmSync(before, { force: true })
      fs.rmSync(after, { force: true })
      return
    }
  }
  throw new Error(
    `switching the simulator to ${mode} appearance repainted almost nothing, so this capture would be a ${mode} id on a light screen. either the device is not applying the setting (shut it down, boot it, wait for \`simctl bootstatus -b\`) or the app opted out of it: check UIUserInterfaceStyle in the installed Info.plist, which expo writes as Light unless app.json sets ios.userInterfaceStyle to "automatic"`
  )
}

async function openFixture() {
  try {
    mcp(['simulator', 'stop', '--bundle-id', bundleId])
  } catch (error) {
    // execFileSync puts the tool's own words on stdout rather than in the error message, so
    // matching String(error) alone never sees them. a freshly booted device has never run the
    // app and simctl words that "found nothing to terminate" rather than "not running".
    const said = [
      String(error),
      String((error as { stdout?: unknown }).stdout ?? ''),
      String((error as { stderr?: unknown }).stderr ?? ''),
    ].join('\n')
    if (!/not running|nothing to terminate/i.test(said)) throw error
  }
  mcp(['simulator', 'launch-app', '--bundle-id', bundleId])
  await waitFor('home list', (nodes) => Boolean(byId(nodes, 'nav-one-native-tab-oracle')))
  for (let attempt = 0; attempt < 8; attempt++) {
    const nodes = snapshot()
    const app = nodes.find((n) => n.type === 'Application')?.frame
    const row = byId(nodes, 'nav-one-native-tab-oracle')?.frame
    if (!app || !row) throw new Error('the oracle home row disappeared while scrolling')
    if (row.y >= 0 && row.y + row.height <= app.height) {
      // a tap that lands while the list is still coasting from the swipe hits nothing, so
      // require the row to hold the same position across two snapshots before tapping it.
      await Bun.sleep(300)
      const settled = byId(snapshot(), 'nav-one-native-tab-oracle')?.frame
      if (!settled || Math.abs(settled.y - row.y) > 0.5) continue
      mcp(['ui-automation', 'tap', '--id', 'nav-one-native-tab-oracle'])
      try {
        await waitFor('oracle fixture', (n) => labels(n).some((l) => l.startsWith('Cell: ')), 8_000)
        return
      } catch {
        continue
      }
    }
    mcp([
      'ui-automation', 'swipe',
      '--x1', String(Math.round(app.width / 2)), '--y1', String(Math.round(app.height * 0.75)),
      '--x2', String(Math.round(app.width / 2)), '--y2', String(Math.round(app.height * 0.35)),
      '--duration', '0.3',
    ])
    await Bun.sleep(400)
  }
  throw new Error('could not bring the oracle home row into view')
}

/**
 * `requireSeparation` is the refusal to record a capsule the plateau cannot separate from what
 * it is drawn on. it is on for every resting cell. it comes off only for a capture where the
 * backdrop is SwiftUI's own and not the fixture's, such as the white list More presents, and
 * those captures carry `barMeasurementTrusted: false` and their disagreement numbers instead.
 */
function measure(
  cell: OracleCell,
  file: string,
  captureName = cell.id,
  requireSeparation = true
) {
  const capture = new Capture(file)
  const found = capsules(capture)
  if (!found.length) throw new Error(`${cell.id}: no capsule found in ${file}`)
  const record = (m: (typeof found)[number]) => ({
    rect: m.rect,
    method:
      m.seeding === 'rim'
        ? 'rim-trace top edge, interior-plateau left/right/bottom edges'
        : 'interior-plateau throughout; the rim trace has no valid signature on this capture',
    seeding: m.seeding,
    crossCheckedEdges: m.crossCheckedEdges,
    crossCheckPt: m.crossCheck,
    disagreementPt: m.disagreement,
    interiorColor: m.interior,
    interiorOverBackground: m.interiorOverBackground,
  })
  const main = found[0]
  const detached = found[1] ?? null
  const indicator = selectionIndicator(capture, main.rect, main.interior)
  // a selected detached search tab carries the indicator in its own capsule, not in the pill
  const detachedIndicator = detached
    ? selectionIndicator(capture, detached.rect, detached.interior)
    : null
  const flats = [main.interior, ...(indicator ? [indicator.color] : [])]
  const mainTabs = tabsInCapsule(capture, main.rect, flats)
  const detachedTabs = detached
    ? tabsInCapsule(capture, detached.rect, [detached.interior])
    : []

  // a capsule the plateau cannot separate from what it is drawn on is a capsule whose left,
  // right and bottom edges mean nothing, so refuse to record it rather than record a guess.
  const separated = main.interiorOverBackground >= 3
  if (requireSeparation && !separated)
    throw new Error(
      `${cell.id}: the capsule interior is only ${main.interiorOverBackground} off the background it is drawn on, so its plateau edges cannot be trusted`
    )
  // a null disagreement is not an agreement. it means that edge had one method, so there was
  // nothing to disagree with, and `crossCheckedEdges` is what says so.
  const disagrees = (capsule: (typeof found)[number]) =>
    (capsule.disagreement.left ?? 0) > 3 ||
    (capsule.disagreement.right ?? 0) > 3 ||
    capsule.disagreement.top > 4
  for (const [index, capsule] of found.entries())
    if (disagrees(capsule))
      console.warn(
        `WARN ${cell.id}: capsule ${index} methods disagree by ${JSON.stringify(capsule.disagreement)}pt`
      )
  // the rect is trustworthy only when the plateau separated from what the capsule is drawn on
  // AND the two methods landed on the same edges. over the white list More presents, the
  // capsule is white glass on white and neither holds, so the rect from that capture must not
  // be read even though the ink inside it still can be.
  const barMeasurementTrusted = separated && !disagrees(main)
  // trust and corroboration are different things, and collapsing them would let a capture with
  // one method read exactly like a capture where two agreed. this says how many pixel methods
  // actually produced each edge, so a dark row cannot be quoted as if it were as checked as a
  // light one.
  const barMeasurementCrossCheckedEdges = main.crossCheckedEdges

  // r27161 fits a per-tab width off these, so they are lifted out of mainTabs rather than left
  // to be recomputed. a centre is the glyph ink centre, falling back to the label ink centre
  // for a tab that has no glyph.
  const centers = mainTabs.map((tab) => tab.glyphCenterX ?? tab.labelCenterX)
  const pitch = centers
    .slice(1)
    .map((center, index) =>
      center === null || centers[index] === null
        ? null
        : Math.round((center - centers[index]!) * 10) / 10
    )
  // the two inks are independent measurements of the same centre; a tab where they disagree by
  // more than a point is a tab whose segmentation went wrong.
  const centerDisagreement = mainTabs.map((tab) =>
    tab.glyphCenterX === null || tab.labelCenterX === null
      ? null
      : Math.round(Math.abs(tab.glyphCenterX - tab.labelCenterX) * 10) / 10
  )

  // an icon-only tab is the case where a reserved-but-empty label row would show up: the glyph
  // sits above the capsule's vertical centre rather than on it. one subtraction, same cell.
  const capsuleCenterY = main.rect.y + main.rect.height / 2
  const glyphOffsetFromCapsuleCenterPt = mainTabs.map((tab) =>
    tab.glyphCenterY === null
      ? null
      : Math.round((tab.glyphCenterY - capsuleCenterY) * 10) / 10
  )

  return {
    id: cell.id,
    axis: cell.axis,
    note: cell.note,
    spec: {
      tabs: cell.tabs,
      selectedIndex: cell.selectedIndex,
      appearance: cell.appearance,
      tabBarMinimizeBehavior: cell.minimizeBehavior,
      sidebarAdaptable: cell.sidebarAdaptable,
    },
    capture: `captures/${captureName}.png`,
    barMeasurementTrusted,
    barMeasurementCrossCheckedEdges,
    captureOriginPt: { x: 0, y: 700 },
    screenPt: SCREEN_PT,
    pageContentBottomPt: pageContentBottom(capture),
    mainCapsule: record(main),
    detachedCapsule: detached ? record(detached) : null,
    detachedGapPt: detached
      ? Math.round((detached.rect.x - (main.rect.x + main.rect.width)) * 10) / 10
      : null,
    detachedTrailingMarginPt: detached
      ? Math.round((SCREEN_PT.width - (detached.rect.x + detached.rect.width)) * 10) / 10
      : null,
    mainTrailingMarginPt:
      Math.round((SCREEN_PT.width - (main.rect.x + main.rect.width)) * 10) / 10,
    selectionIndicator: indicator
      ? { rect: indicator.rect, color: indicator.color, method: 'second-flat-colour' }
      : null,
    detachedSelectionIndicator: detachedIndicator
      ? { rect: detachedIndicator.rect, color: detachedIndicator.color, method: 'second-flat-colour' }
      : null,
    tabCentersPt: centers,
    mainCapsuleCenterYPt: Math.round(capsuleCenterY * 10) / 10,
    glyphOffsetFromCapsuleCenterPt,
    tabPitchPt: pitch,
    tabCenterGlyphVsLabelPt: centerDisagreement,
    mainTabs,
    detachedTabs,
  }
}


const scrollOffsetOf = (nodes: Node[]) => {
  const label = labels(nodes).find((l) => l.startsWith('Scroll offset: '))
  return label ? Number(label.slice('Scroll offset: '.length)) : null
}

/** the accessibility tree as its own record. for the bar it publishes one opaque `Tab Bar`
 * group and nothing per tab, which is why every bar number is measured from pixels. the
 * overflow list is the opposite: it publishes a node per row, so its rows can be measured a
 * second time from frames that share no step with the hairline trace. */
const axRecord = (nodes: Node[]) =>
  nodes
    .filter((n) => n.frame && (n.AXLabel || n.AXUniqueId))
    .map((n) => ({
      type: n.type ?? null,
      label: n.AXLabel ?? null,
      id: n.AXUniqueId ?? null,
      frame: {
        x: Math.round((n.frame!.x ?? 0) * 10) / 10,
        y: Math.round((n.frame!.y ?? 0) * 10) / 10,
        width: Math.round((n.frame!.width ?? 0) * 10) / 10,
        height: Math.round((n.frame!.height ?? 0) * 10) / 10,
      },
    }))

const tap = (x: number, y: number) =>
  mcp(['ui-automation', 'tap', '--x', String(Math.round(x)), '--y', String(Math.round(y))])

/** one slow drag, long enough that the scroll view mostly follows the finger instead of being
 * flung. a fling would land the sweep on offsets nobody chose, and the point of the sweep is
 * to sample many offsets rather than to reach the bottom fast. */
const drag = (fromY: number, toY: number) =>
  mcp([
    'ui-automation', 'swipe',
    '--x1', '196', '--y1', String(Math.round(fromY)),
    '--x2', '196', '--y2', String(Math.round(toY)),
    '--duration', '0.9',
  ])

/**
 * walk the fixture forward until the cell it is showing is the one asked for. the fixture has
 * one button and cycles, so this reaches any cell from any cell, which is what makes --only
 * usable on a matrix whose later cells take an interaction to set up.
 */
async function advanceTo(cell: OracleCell) {
  for (let step = 0; step <= 2 * cells.length + 2; step++) {
    const nodes = snapshot()
    if (labels(nodes).includes(`Cell: ${cell.id}`)) {
      // a tap issued a moment ago can still be in flight when the snapshot showing the target
      // arrives, and it would advance the fixture one more cell while the capture is being
      // taken. so the cell has to still be the target on a second look before capturing it.
      await Bun.sleep(500)
      if (labels(snapshot()).includes(`Cell: ${cell.id}`)) return nodes
      continue
    }
    mcp(['ui-automation', 'tap', '--id', 'tab-oracle-next'])
    await Bun.sleep(450)
  }
  throw new Error(`could not reach cell ${cell.id} by advancing the fixture`)
}

const saveBand = (file: string, name: string) =>
  saveCrop(
    readPng(file),
    { x: 0, y: BAND_TOP_PT, width: SCREEN_PT.width, height: SCREEN_PT.height - BAND_TOP_PT },
    path.join(capturesDir, `${name}.png`)
  )

/** the overflow screen is a whole page rather than a band, so it is committed whole. */
const saveFull = (file: string, name: string) =>
  saveCrop(
    readPng(file),
    { x: 0, y: 0, width: SCREEN_PT.width, height: SCREEN_PT.height },
    path.join(capturesDir, `${name}.png`)
  )

const wanted = only ? only.split(',').map((value) => value.trim()).filter(Boolean) : []
const queue = wanted.length ? cells.filter((cell) => wanted.includes(cell.id)) : cells
if (!queue.length) throw new Error(`--only ${only} matches no cell`)
const unmatched = wanted.filter((id) => !cells.some((cell) => cell.id === id))
if (unmatched.length) throw new Error(`--only names no such cell: ${unmatched.join(', ')}`)

const results: unknown[] = []
let appearance: 'light' | 'dark' | null = null
if (fromCaptures) {
  // an interaction cell is a sequence of captures under names this path does not know how to
  // reconstruct, so re-measuring one from disk would quietly drop it out of the table
  const interactive = queue.filter((cell) => cell.interaction.kind !== 'none')
  if (interactive.length)
    throw new Error(
      `--from-captures cannot re-measure interaction cells (${interactive.map((c) => c.id).join(', ')}); re-run those cells against the simulator`
    )
  for (const cell of queue) results.push(measure(cell, path.join(fullDir, `${cell.id}.png`)))
  console.log(`re-measured ${results.length} cells from ${fullDir}`)
} else {
  await openFixture()
}

for (const [index, cell] of fromCaptures ? [] : queue.entries()) {
  if (cell.appearance !== appearance) {
    await setAppearance(cell.appearance)
    appearance = cell.appearance
  }
  await advanceTo(cell)
  // the label the fixture renders comes from the same module the driver walks, so a capture
  // that shows the right cell id cannot have come from an older bundle
  await waitFor(`cell ${cell.id}`, (nodes) => labels(nodes).includes(`Cell: ${cell.id}`), 25_000)

  const restFile = path.join(fullDir, `${cell.id}.png`)
  await settledCapture(restFile)

  if (cell.interaction.kind === 'none') {
    results.push(measure(cell, restFile))
    saveBand(restFile, cell.id)
    writeTable()
    console.log(`captured ${index + 1}/${queue.length} ${cell.id}`)
    continue
  }

  // every interaction cell photographs its own resting state first, so the delta an
  // interaction produced is a subtraction inside one cell rather than a comparison across two
  // cells that were mounted at different times
  const rest = measure(cell, restFile, `${cell.id}-rest`)
  saveBand(restFile, `${cell.id}-rest`)

  if (cell.interaction.kind === 'more' || cell.interaction.kind === 'moreRow') {
    // the More tab is the last slot the bar drew, and where that is comes from this cell's own
    // resting capture rather than from an assumed pitch
    const slots = rest.tabCentersPt.filter((value): value is number => value !== null)
    const moreX = slots[slots.length - 1]
    const firstX = slots[0]
    if (moreX === undefined) throw new Error(`${cell.id}: no tab centres to find the More slot`)
    tap(moreX, rest.mainCapsuleCenterYPt)
    // settling proves the screen stopped moving, which is not the same as the tap having landed.
    // the dev client's "Refreshing..." banner shoves the whole screen down and then holds still,
    // so a capture taken while it is up is both perfectly settled and displaced by its height,
    // and the tap computed from an undisplaced frame lands on the wrong tab. the overflow
    // destination publishes one accessibility node per row, so wait for the rows themselves
    // rather than for the clock: a tap that missed can never satisfy this.
    const overflowTitles = cell.tabs.slice(VISIBLE_SLOTS_BEFORE_MORE).map((tab) => tab.title)
    await waitFor(`${cell.id}: the More destination`, (nodes) => {
      const shown = labels(nodes)
      return overflowTitles.every((title) => shown.includes(title))
    })
    const moreFile = path.join(fullDir, `${cell.id}-more.png`)
    await settledCapture(moreFile, OVERFLOW_TOP_PT)
    const moreNodes = snapshot()
    const moreCapture = new Capture(moreFile)
    // start the hairline search below the navigation bar the fixture's own router draws, and
    // stop above the bar band, so neither is mistaken for list chrome
    const list = overflowList(moreCapture, OVERFLOW_TOP_PT, BAND_TOP_PT)
    const moreBar = measure(cell, moreFile, `${cell.id}-more`, false)
    saveFull(moreFile, `${cell.id}-more`)

    let selected: ReturnType<typeof measure> | null = null
    let selectedList: ReturnType<typeof overflowList> = null
    let selectedAx: ReturnType<typeof axRecord> | null = null
    if (cell.interaction.kind === 'moreRow') {
      const row = list?.rows[cell.interaction.row]
      if (!row) throw new Error(`${cell.id}: the overflow list has no row ${cell.interaction.row}`)
      tap(SCREEN_PT.width / 2, row.rowCenterYPt)
      // selecting a row pushes a second level whose back button is titled "More", so that button
      // is the proof the push happened rather than the tap landing on empty list background
      await waitFor(`${cell.id}: the pushed row destination`, (nodes) =>
        nodes.some((node) => node.AXLabel === 'More' && node.type === 'Button')
      )
      const selectedFile = path.join(fullDir, `${cell.id}-selected.png`)
      await settledCapture(selectedFile, OVERFLOW_TOP_PT)
      selectedAx = axRecord(snapshot())
      selected = measure(cell, selectedFile, `${cell.id}-selected`, false)
      selectedList = overflowList(new Capture(selectedFile), OVERFLOW_TOP_PT, BAND_TOP_PT)
      saveFull(selectedFile, `${cell.id}-selected`)
    }

    results.push({
      id: cell.id,
      axis: cell.axis,
      note: cell.note,
      spec: {
        tabs: cell.tabs,
        selectedIndex: cell.selectedIndex,
        appearance: cell.appearance,
        tabBarMinimizeBehavior: cell.minimizeBehavior,
        sidebarAdaptable: cell.sidebarAdaptable,
        interaction: cell.interaction,
      },
      atRest: rest,
      moreOpen: {
        capture: `captures/${cell.id}-more.png`,
        bar: moreBar,
        list,
        accessibility: axRecord(moreNodes),
      },
      afterSelectingRow:
        selected && cell.interaction.kind === 'moreRow'
          ? {
              row: cell.interaction.row,
              capture: `captures/${cell.id}-selected.png`,
              bar: selected,
              list: selectedList,
              accessibility: selectedAx,
            }
          : null,
      // the whole promotion question in one boolean pair, measured rather than eyeballed. both
      // report null rather than a verdict when either side's slots could not be read, because
      // two failed segmentations agree with each other: a run whose capsule detection collapsed
      // to one centre once reported "unchanged: true" off a screen where More never opened, which
      // is the right answer arrived at from no evidence. a comparison that cannot fail is not one.
      barSlotsUnchangedByOpeningMore: slotsComparable(rest, moreBar)
        ? JSON.stringify(moreBar.tabCentersPt) === JSON.stringify(rest.tabCentersPt)
        : null,
      barSlotsUnchangedBySelectingRow:
        selected && slotsComparable(moreBar, selected)
          ? JSON.stringify(selected.tabCentersPt) === JSON.stringify(moreBar.tabCentersPt)
          : null,
    })
    writeTable()
    // leave the overflow screen so the fixture's Next button is reachable again
    if (firstX !== undefined) tap(firstX, rest.mainCapsuleCenterYPt)
    await Bun.sleep(600)
    console.log(`captured ${index + 1}/${queue.length} ${cell.id}`)
    continue
  }

  // ---- scroll sweep ----------------------------------------------------------------------
  // settled frames only. a frame caught mid-animation is not a state, so every frame here has
  // passed the same two-screenshots-400ms-apart guard as every resting cell in the table.
  const frames: unknown[] = []
  const frame = async (label: string, order: number) => {
    const name = `${cell.id}-${String(order).padStart(2, '0')}-${label}`
    const file = path.join(fullDir, `${name}.png`)
    await settledCapture(file)
    const nodes = snapshot()
    saveBand(file, name)
    // a bar that minimized all the way to nothing has no capsule to find. that is a reading,
    // not a failure, so the frame records it rather than aborting the sweep. every other
    // failure still throws.
    let measured: ReturnType<typeof measure> | null = null
    try {
      measured = measure(cell, file, name)
    } catch (error) {
      if (!/no capsule found/.test(String(error))) throw error
    }
    if (!measured) {
      frames.push({
        order,
        phase: label,
        scrollOffsetPt: scrollOffsetOf(nodes),
        capture: `captures/${name}.png`,
        capsuleAbsent: true,
      })
      return
    }
    frames.push({
      order,
      phase: label,
      scrollOffsetPt: scrollOffsetOf(nodes),
      capture: `captures/${name}.png`,
      capsuleAbsent: false,
      mainCapsule: measured.mainCapsule,
      detachedCapsule: measured.detachedCapsule,
      detachedGapPt: measured.detachedGapPt,
      selectionIndicator: measured.selectionIndicator,
      tabCentersPt: measured.tabCentersPt,
      mainTabs: measured.mainTabs,
      pageContentBottomPt: measured.pageContentBottomPt,
    })
  }

  let order = 0
  await frame('rest', order++)
  const STEPS = 9
  for (let step = 0; step < STEPS; step++) {
    drag(620, 420)
    await frame('down', order++)
  }
  for (let step = 0; step < STEPS; step++) {
    drag(420, 620)
    await frame('up', order++)
  }

  results.push({
    id: cell.id,
    axis: cell.axis,
    note: cell.note,
    spec: {
      tabs: cell.tabs,
      selectedIndex: cell.selectedIndex,
      appearance: cell.appearance,
      tabBarMinimizeBehavior: cell.minimizeBehavior,
      sidebarAdaptable: cell.sidebarAdaptable,
      interaction: cell.interaction,
    },
    sweep: {
      dragPt: { from: 620, to: 420, durationSeconds: 0.9, steps: STEPS },
      frames,
    },
  })
  writeTable()
  console.log(`captured ${index + 1}/${queue.length} ${cell.id} (${frames.length} frames)`)
}

// the matrix ends on its dark cells, and a simulator left in dark mode silently changes what
// every other suite on this device captures next.
if (!fromCaptures && appearance !== 'light') await setAppearance('light')

/**
 * write what has been measured so far. called after every cell rather than once at the end,
 * because a matrix run is long and an interaction cell can fail late: writing once meant a
 * failure on the last cell threw away every capture before it, and the captures are the
 * expensive part.
 */
function writeTable() {
  let merged = results
  if (merge) {
    if (!fs.existsSync(tablePath))
      throw new Error(`--merge needs an existing ${tablePath} to merge into`)
    const existing = JSON.parse(fs.readFileSync(tablePath, 'utf8')).cells as { id: string }[]
    const byIdNow = new Map<string, unknown>(existing.map((cell) => [cell.id, cell]))
    for (const cell of results) byIdNow.set((cell as { id: string }).id, cell)
    // the matrix decides the order, so a merged table and a full run produce the same file
    merged = cells.flatMap((cell) => (byIdNow.has(cell.id) ? [byIdNow.get(cell.id)] : []))
    const orphans = [...byIdNow.keys()].filter((id) => !cells.some((cell) => cell.id === id))
    if (orphans.length)
      throw new Error(
        `the table on disk holds cells the matrix no longer defines (${orphans.join(', ')}); remove them or restore the specs rather than dropping them silently`
      )
  }

  const table = {
    generatedBy: 'tests/native-features/scripts/tab-bar-oracle.ts',
    device: 'iPhone 16, 393x852pt, 3x',
    units: 'points, origin top-left of the screen',
    captures:
      'captures/<id>.png is the bar band of the full capture, cropped at captureOriginPt; an overflow capture is the whole screen. every number in the cell is in full-screen coordinates',
    fixture: 'tests/native-features/app/one-native-tab-oracle.tsx (full screen, no container inset)',
    methods: {
      'rim-trace':
        'a capsule top edge is a luminance trough followed by a spike; owns rect.y and cross-checks left/right',
      'interior-plateau':
        'the capsule interior is one exact flat value; an edge is where a row leaves it. owns rect.x, width and height',
      ink: 'glyph and label pixels, which measure each tab centre twice from two independent inks',
      'second-flat-colour':
        'the selection indicator is the largest non-interior, non-ink flat colour inside the capsule',
      'hairline-trace':
        "the overflow list's row boundaries are its separator hairlines, grouped by the inset they share so a navigation bar's own rule cannot join them",
      accessibility:
        'the overflow list publishes a node per row, so its row frames are a second reading of the same rows that shares no step with the hairline trace. the bar publishes one opaque Tab Bar group and nothing per tab, which is why no bar number comes from it',
    },
    cells: merged,
  }
  fs.writeFileSync(tablePath, JSON.stringify(table, null, 2) + '\n')
  return merged.length
}

const held = writeTable()
console.log(
  merge
    ? `merged ${results.length} cells into ${tablePath}, which now holds ${held}`
    : `wrote ${held} cells to ${tablePath}`
)
