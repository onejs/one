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
const bundleId = arg('--bundle-id', 'com.onestack.native-features')
const outDir = arg('--out', 'tests/native-features/oracle')
const only = arg('--only')
// re-derive the table from captures already on disk. the measurement code changes more often
// than the fixture does, and a re-measure that cannot re-capture also cannot quietly pick up a
// different app state halfway through.
const fromCaptures = args.includes('--from-captures')
if (!simulatorId) throw new Error('--simulator-id is required')

// the table is measured from the full 393x852 capture; what gets committed beside it is the
// bar band alone, which is the only part any number comes from and a tenth of the bytes.
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
async function settledCapture(target: string) {
  const probe = path.join(outDir, 'settle.png')
  for (let attempt = 0; attempt < 12; attempt++) {
    screenshot(probe)
    await Bun.sleep(400)
    screenshot(target)
    const first = fs.readFileSync(probe)
    const second = fs.readFileSync(target)
    if (first.equals(second)) {
      fs.rmSync(probe, { force: true })
      return
    }
  }
  throw new Error(`the screen never settled for ${target}`)
}

async function setAppearance(mode: 'light' | 'dark') {
  execFileSync('xcrun', ['simctl', 'ui', simulatorId, 'appearance', mode], {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  })
  await Bun.sleep(800)
}

async function openFixture() {
  try {
    mcp(['simulator', 'stop', '--bundle-id', bundleId])
  } catch (error) {
    if (!/not running/i.test(String(error))) throw error
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

function measure(cell: OracleCell, file: string) {
  const capture = new Capture(file)
  const found = capsules(capture)
  if (!found.length) throw new Error(`${cell.id}: no capsule found in ${file}`)
  const record = (m: (typeof found)[number]) => ({
    rect: m.rect,
    method: 'rim-trace top edge, interior-plateau left/right/bottom edges',
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
  if (main.interiorOverBackground < 3)
    throw new Error(
      `${cell.id}: the capsule interior is only ${main.interiorOverBackground} off the background it is drawn on, so its plateau edges cannot be trusted`
    )
  for (const [index, capsule] of found.entries())
    if (
      capsule.disagreement.left > 3 ||
      capsule.disagreement.right > 3 ||
      capsule.disagreement.top > 4
    )
      console.warn(
        `WARN ${cell.id}: capsule ${index} methods disagree by ${JSON.stringify(capsule.disagreement)}pt`
      )

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
    capture: `captures/${cell.id}.png`,
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

const queue = only ? cells.filter((cell) => cell.id === only) : cells
if (!queue.length) throw new Error(`--only ${only} matches no cell`)

const results: unknown[] = []
let appearance: 'light' | 'dark' | null = null
if (fromCaptures) {
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
  await waitFor(
    `cell ${cell.id}`,
    (nodes) => labels(nodes).includes(`Cell: ${cell.id}`),
    25_000
  )
  const file = path.join(fullDir, `${cell.id}.png`)
  await settledCapture(file)
  results.push(measure(cell, file))
  saveCrop(
    readPng(file),
    { x: 0, y: BAND_TOP_PT, width: SCREEN_PT.width, height: SCREEN_PT.height - BAND_TOP_PT },
    path.join(capturesDir, `${cell.id}.png`)
  )
  console.log(`captured ${index + 1}/${queue.length} ${cell.id}`)
  if (index < queue.length - 1) {
    mcp(['ui-automation', 'tap', '--id', 'tab-oracle-next'])
  }
}

// the matrix ends on its dark cells, and a simulator left in dark mode silently changes what
// every other suite on this device captures next.
if (!fromCaptures && appearance !== 'light') await setAppearance('light')

const table = {
  generatedBy: 'tests/native-features/scripts/tab-bar-oracle.ts',
  device: 'iPhone 16, 393x852pt, 3x',
  units: 'points, origin top-left of the screen',
  captures:
    'captures/<id>.png is the bar band of the full capture, cropped at captureOriginPt; every number in the cell is in full-screen coordinates',
  fixture: 'tests/native-features/app/one-native-tab-oracle.tsx (full screen, no container inset)',
  methods: {
    'rim-trace':
      'a capsule top edge is a luminance trough followed by a spike; owns rect.y and cross-checks left/right',
    'interior-plateau':
      'the capsule interior is one exact flat value; an edge is where a row leaves it. owns rect.x, width and height',
    ink: 'glyph and label pixels, which measure each tab centre twice from two independent inks',
    'second-flat-colour':
      'the selection indicator is the largest non-interior, non-ink flat colour inside the capsule',
  },
  cells: results,
}
fs.writeFileSync(
  path.join(outDir, 'tab-bar-geometry.json'),
  JSON.stringify(table, null, 2) + '\n'
)
console.log(`wrote ${results.length} cells to ${path.join(outDir, 'tab-bar-geometry.json')}`)
