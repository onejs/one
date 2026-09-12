// measures the SwiftUI floating tab bar out of a full-screen simulator capture.
//
// the fixture cannot paint behind the bar. SwiftUI insets the page content above the floating
// capsule, so whatever colour the page uses stops at the inset and the bar sits on SwiftUI's own
// background: flat white in light mode, flat black in dark. that background is only one or two
// luminance levels off the capsule's glass interior in light mode, so a plain brightness
// threshold finds the page, not the capsule.
//
// what separates them is that the capsule is ringed: page, then a darker drop shadow, then a
// brighter rim, then the interior. three methods run on every capture and all three are
// reported, because a number that only one of them can produce is a number with no check on it:
//
//   rim trace       a capsule's top edge is a luminance trough immediately followed by a spike.
//                   columns carrying that pair are capsule columns. independent variable: the
//                   vertical luminance gradient. a null result (no run wide enough) proves there
//                   is no lit rim, which is what an unrendered or fully minimized bar looks like.
//                   this signature is real only where the capsule is brighter than the surface
//                   it sits on. it must not be run otherwise: where the capsule is darker, the
//                   only trough-then-spike in a column is the capsule interior followed by the
//                   selected tab's indicator, and the trace reports the indicator's ~64pt extent
//                   as the capsule, collapsing segmentation to a single slot.
//   interior plateau  the capsule's glass interior is one exact flat value, distinct from both
//                   the page above it and the shadow beside it. an edge is where a row leaves
//                   that plateau. independent variable: absolute colour membership, no gradient
//                   anywhere. a null result proves the interior is not flat, which is what a
//                   capture taken mid-animation looks like.
//   ink             glyph and label pixels, which are neither capsule chrome nor background.
//                   a tab's centre is measured once from its glyph ink and once from its label
//                   ink, two independent inks. independent variable: distance from the
//                   capsule's own flat colours. a null result proves the capsule painted no
//                   content at all.
//
// the rim trace owns the top edge, because the rim IS the topmost painted row. the interior
// plateau owns the left, right and bottom edges, because the rim fades out around the rounded
// corners and under-reports width. disagreements between them are reported, never averaged.
//
// which method finds the capsule's columns in the first place is decided by measurement, not by
// an appearance flag: `bandSurfaces` reads the capsule interior and the background it is drawn
// on and returns the distance between them. that distance is about 1 level where the bar is
// light glass on a light background, which no membership test can resolve, so the rim trace
// seeds there. it is tens of levels where the bar is dark on black, so membership seeds there
// and the rim trace is not run at all. an appearance flag would have been the wrong control
// surface: the thing that decides whether a method works is contrast, and a capture can be dark
// with light chrome or light with a dark sheet behind it.
//
// what this costs, recorded per capsule rather than hidden: where membership seeds, the left and
// right edges have ONE method, because the rim that would have checked them is the thing that
// does not exist. `crossCheckedEdges` says which edges two methods agreed on, and it is shorter
// in that case.
import { readPng } from './visual-pixel-gate'

export const SCREEN_PT = { width: 393, height: 852 }
// the band the floating bar can occupy. the home indicator sits below it and the fixture panel
// well above it, so nothing else in the capture is inside these rows.
const BAND_TOP_PT = 700
const BAND_BOTTOM_PT = 836

export type Box = { x: number; y: number; width: number; height: number }
type RGB = [number, number, number]

const round1 = (value: number) => Math.round(value * 10) / 10
const dist = (a: RGB, b: RGB) =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])
const luma = (c: RGB) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]

export class Capture {
  readonly scale: number
  readonly width: number
  readonly height: number
  private readonly data: Buffer
  constructor(readonly path: string) {
    const png = readPng(path)
    this.data = png.data
    this.width = png.width
    this.height = png.height
    this.scale = png.width / SCREEN_PT.width
  }
  px(x: number, y: number): RGB {
    const i = (y * this.width + x) * 4
    return [this.data[i], this.data[i + 1], this.data[i + 2]]
  }
  pt(value: number) {
    return round1(value / this.scale)
  }
  get band() {
    return {
      top: Math.round(BAND_TOP_PT * this.scale),
      bottom: Math.round(BAND_BOTTOM_PT * this.scale),
    }
  }
}

/** true when every pixel within `radius` also matches, which excludes antialiasing. */
function eroded(capture: Capture, x: number, y: number, color: RGB, radius: number): boolean {
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) {
      const sx = x + dx
      const sy = y + dy
      if (sx < 0 || sy < 0 || sx >= capture.width || sy >= capture.height) return false
      if (dist(capture.px(sx, sy), color) > 12) return false
    }
  return true
}

type Run = { from: number; to: number }

function runs(flags: boolean[], minLength: number): Run[] {
  const found: Run[] = []
  let start = -1
  for (let i = 0; i <= flags.length; i++) {
    if (i < flags.length && flags[i]) {
      if (start < 0) start = i
    } else if (start >= 0) {
      if (i - start >= minLength) found.push({ from: start, to: i - 1 })
      start = -1
    }
  }
  return found
}

/** linear 50% crossing of a step, walking outward from inside the plateau. */
function crossing(
  profile: number[],
  inside: number,
  direction: -1 | 1,
  low: number,
  high: number
): number {
  const level = (low + high) / 2
  for (let i = inside; i >= 0 && i < profile.length; i += direction) {
    const here = profile[i]
    const next = profile[i + direction]
    if (next === undefined) return i
    if (here >= level && next < level) {
      const span = here - next
      return span === 0 ? i : i + direction * ((here - level) / span)
    }
  }
  return direction < 0 ? 0 : profile.length - 1
}

export type CapsuleMeasurement = {
  /** points, screen coordinates. top from the rim trace, the other three from the plateau */
  rect: Box
  /** how the capsule's columns were found. chosen by measured contrast, never by appearance. */
  seeding: 'rim' | 'membership'
  crossCheck: {
    /**
     * the rim trace's own horizontal extent, which fades out around the rounded corners. null
     * where membership seeded, because the rim trace was not run: it has no valid signature on a
     * capsule darker than its background and would have returned the selection indicator.
     */
    rimLeft: number | null
    rimRight: number | null
    /** the topmost row that is neither page nor background, found without any gradient */
    membershipTop: number
  }
  /** absolute difference between the two methods on each edge they both produce, points */
  disagreement: { left: number | null; right: number | null; top: number }
  /** the edges two independent methods both produced, so a reader can see what was checked */
  crossCheckedEdges: ('left' | 'right' | 'top')[]
  interior: RGB
  /** how far the interior sits off the background it is drawn on, summed over channels */
  interiorOverBackground: number
}

/**
 * the two flat surfaces the bar band is built from: the capsule's interior and the background
 * SwiftUI draws the bar on. the distance between them is what decides which method can find the
 * capsule's edges at all, so it is measured per capture rather than assumed per appearance.
 *
 * the interior is the most common colour in a thin strip just below the capsule's top edge,
 * sampled across the middle third of the width only. the main capsule is centred and always
 * covers that third, a selected tab's indicator is at most half of it, and no glyph reaches so
 * close to the top edge. the background is read at the bottom-left corner, below the capsule and
 * outside it, which is the one place a bar reaching within 20pt of the screen edge cannot cover.
 *
 * the strip is deliberately NOT filtered against the page colour. over the list that `More`
 * presents the page is white and the capsule's glass interior is 253, two levels apart, so a
 * page filter deletes the interior and leaves the selected tab's indicator as the most common
 * colour. that reads as high contrast against the background and sends a light capture down the
 * membership path, which then measures the indicator and calls it the capsule.
 */
export function bandSurfaces(capture: Capture) {
  const sc = capture.scale
  const page = capture.px(Math.round(3 * sc), Math.round(735 * sc))
  const background = capture.px(Math.round(4 * sc), Math.round(849 * sc))
  const counts = new Map<string, { color: RGB; n: number }>()
  for (let y = Math.round(773 * sc); y < Math.round(777 * sc); y++)
    for (let x = Math.round(capture.width / 3); x < Math.round((capture.width * 2) / 3); x++) {
      const color = capture.px(x, y)
      const key = `${color[0]},${color[1]},${color[2]}`
      const seen = counts.get(key)
      if (seen) seen.n++
      else counts.set(key, { color, n: 1 })
    }
  const interior = [...counts.values()].sort((a, b) => b.n - a.n)[0]?.color ?? background
  return { interior, background, page, separation: dist(interior, background) }
}

/**
 * the separation at which membership can find a capsule edge on its own. below it the interior
 * and the background are the same colour to within antialiasing and only the rim distinguishes
 * them; the light bar measures about 1 and the dark bar about 54.
 */
const MEMBERSHIP_SEPARATION = 20

/**
 * every capsule in the bar band, left to right. the main capsule is the first, a detached
 * search capsule the second.
 *
 * membership is the whole problem in light mode: the glass interior sits ONE level off the page
 * behind it (253 against 254), while the drop shadow beside it sits ten levels off. so a pixel
 * belongs to the capsule when it either matches the interior's exact flat value or is far enough
 * from the page to be content (an indicator, a glyph, a label). the shadow satisfies neither.
 */
/**
 * capsule column runs, found by colour alone. usable only where the interior stands far enough
 * off the background to be told apart, which `bandSurfaces` measures before this is called.
 *
 * the strip is read a few points below the capsule's top edge, where the rounded ends inset the
 * capsule slightly; that is deliberate, because these runs only have to land inside a capsule.
 * the caller walks outward from them to find the true edges at half height.
 */
export function membershipSeeds(
  capture: Capture,
  surfaces: ReturnType<typeof bandSurfaces>
): { left: number; right: number; top: number }[] {
  const sc = capture.scale
  const stripY = Math.round(775 * sc)
  // a capsule pixel is far from the background AND is not the page. the page has to be excluded
  // by name: it is further from the background than the capsule is, so a strip that fell above
  // the capsule's top edge would otherwise read as one capsule spanning the whole screen.
  const capsulePixel = (x: number, y: number) => {
    const color = capture.px(x, y)
    return (
      dist(color, surfaces.page) > 6 && dist(color, surfaces.background) > MEMBERSHIP_SEPARATION
    )
  }
  const inside: boolean[] = []
  for (let x = 0; x < capture.width; x++) inside.push(capsulePixel(x, stripY))
  return runs(inside, Math.round(20 * sc)).map((run) => {
    // the top edge, walked up the run's own centre where the rounded ends cannot cut it short
    const centre = Math.round((run.from + run.to) / 2)
    let top = stripY
    while (top > capture.band.top && capsulePixel(centre, top - 1)) top--
    return { left: capture.pt(run.from), right: capture.pt(run.to + 1), top: capture.pt(top) }
  })
}

export function capsules(capture: Capture): CapsuleMeasurement[] {
  const sc = capture.scale
  const { bottom } = capture.band
  const surfaces = bandSurfaces(capture)
  const seeding: 'rim' | 'membership' =
    surfaces.separation >= MEMBERSHIP_SEPARATION ? 'membership' : 'rim'
  const seeds = seeding === 'membership' ? membershipSeeds(capture, surfaces) : null
  const found: CapsuleMeasurement[] = []
  let cursor = 0
  let seedIndex = 0
  while (cursor < capture.width) {
    const seed = seeds ? seeds[seedIndex++] : rimTrace(capture, cursor, capture.width)
    if (!seed) break
    const rim = seeding === 'rim' ? seed : null
    const rimLeft = Math.round(seed.left * sc)
    const rimRight = Math.round(seed.right * sc)
    const rimTopPx = Math.round(seed.top * sc)
    cursor = rimRight + Math.round(4 * sc)

    // the interior is the colour that covers most of the strip below the capsule's top edge, not
    // a single probed pixel. it used to be read 2.5pt inside the capsule's left end, on the
    // reasoning that the selection indicator is inset far enough never to reach there. the
    // margin was about 3pt in light and the dark indicator is inset less, so the probe landed
    // inside the selected tab's pill and returned it as the capsule interior. everything
    // downstream then inverted: the real interior became the "second flat colour", and the
    // indicator was reported as spanning the whole capsule.
    const probeX = rimLeft + Math.round(2.5 * sc)
    const firstMidY = rimTopPx + Math.round(30 * sc)
    const interior = surfaces.interior
    // the background the bar is drawn on, read at the bottom-left corner of the screen. beside
    // the capsule it cannot be read at all: a five-tab bar reaches within 20pt of the screen
    // edge and its drop shadow covers the rest, which reads as the interior's own value.
    const background = surfaces.background
    // the fixture's page colour is far from the background too, so it has to be excluded by
    // name; without this the upward walk runs straight out of the bar and into the page.
    const page = surfaces.page
    const inCapsule = (x: number, y: number) => {
      const c = capture.px(x, y)
      if (dist(c, page) <= 6) return false
      return dist(c, interior) <= 6 || dist(c, background) > 40
    }
    const walk = (x: number, y: number, dx: -1 | 0 | 1, dy: -1 | 0 | 1) => {
      let last = dx ? x : y
      for (let step = 1; step < capture.width; step++) {
        const nx = x + dx * step
        const ny = y + dy * step
        if (nx < 1 || ny < 1 || nx >= capture.width - 1 || ny >= bottom) break
        if (inCapsule(nx, ny)) {
          last = dx ? nx : ny
          continue
        }
        if (!inCapsule(nx + dx, ny + dy) && !inCapsule(nx + 2 * dx, ny + 2 * dy)) break
      }
      return last
    }
    // vertical extent at the capsule's horizontal centre, where its rounded ends cannot cut the
    // scan short. horizontal extent at half height, where it is at its widest.
    const centreX = Math.round((rimLeft + rimRight) / 2)
    const bottomPx = walk(centreX, firstMidY, 0, 1)
    const plateauTopPx = walk(centreX, firstMidY, 0, -1)
    const midY = Math.round((rimTopPx + bottomPx) / 2)
    const leftPx = walk(probeX, midY, -1, 0) - 0.5
    const rightPx = walk(rimRight - Math.round(2.5 * sc), midY, 1, 0) + 0.5

    const rect = {
      x: capture.pt(leftPx),
      y: capture.pt(rimTopPx),
      width: round1(capture.pt(rightPx) - capture.pt(leftPx)),
      height: round1(capture.pt(bottomPx + 1) - capture.pt(rimTopPx)),
    }
    found.push({
      rect,
      seeding,
      crossCheck: {
        rimLeft: rim ? rim.left : null,
        rimRight: rim ? rim.right : null,
        membershipTop: capture.pt(plateauTopPx),
      },
      disagreement: {
        left: rim ? round1(Math.abs(rim.left - rect.x)) : null,
        right: rim ? round1(Math.abs(rim.right - (rect.x + rect.width))) : null,
        top: round1(Math.abs(capture.pt(plateauTopPx) - rect.y)),
      },
      // where membership seeded, NO edge here has two methods. the seed's top and the plateau
      // walk's top are both colour membership, so agreeing with each other proves only that the
      // same test was run twice. the independent check on that top edge is the accessibility
      // tree's Tab Bar frame, which the driver records beside this and which is not a pixel.
      crossCheckedEdges: rim ? ['left', 'right', 'top'] : [],
      interior,
      interiorOverBackground: dist(interior, background),
    })
  }
  return found
}

/**
 * where the page content stops above the bar. the fixture paints the page one flat colour, so
 * this is SwiftUI's own bottom safe-area inset for tab content, which is the number rnx models
 * as getFloatingTabBarHeight(). independent variable: the row the page colour ends on. a null
 * result (the page colour never appears) proves the fixture did not paint.
 */
export function pageContentBottom(capture: Capture): number | null {
  const sc = capture.scale
  const x = Math.round(8 * sc)
  const page = capture.px(x, Math.round(500 * sc))
  let last = -1
  for (let y = Math.round(500 * sc); y < Math.round(852 * sc); y++)
    if (dist(capture.px(x, y), page) <= 6) last = y
    else if (last >= 0 && y > last + Math.round(3 * sc)) break
  return last < 0 ? null : capture.pt(last + 1)
}

/**
 * method B. a capsule's top edge is a luminance trough followed within a few pixels by a
 * spike; columns carrying that pair are capsule columns.
 */
export function rimTrace(
  capture: Capture,
  searchFrom: number,
  searchTo: number
): { left: number; right: number; top: number } | null {
  const { top, bottom } = capture.band
  const sc = capture.scale
  const margin = Math.round(16 * sc)
  const window = Math.max(2, Math.round(3 * sc))
  const column = (x: number) => {
    const profile: number[] = []
    for (let y = top; y < bottom; y++) {
      let total = 0
      let count = 0
      for (let dx = -1; dx <= 1; dx++) {
        const sx = x + dx
        if (sx < 0 || sx >= capture.width) continue
        total += luma(capture.px(sx, y))
        count++
      }
      profile.push(total / count)
    }
    return profile
  }
  // the rim is the row with the largest rise out of the shadow trough that then holds. a plain
  // gradient (the page card above the bar) never produces one, because it has no trough.
  const rimTop = (x: number): number | undefined => {
    const profile = column(x)
    let best: { index: number; rise: number } | undefined
    for (let i = window * 3; i < profile.length - window * 3; i++) {
      let floor = Infinity
      for (let k = 1; k <= window * 2; k++) floor = Math.min(floor, profile[i - k])
      const rise = profile[i] - floor
      if (rise < 1.5) continue
      // the trough has to be a trough: darker than the surface above it
      const ceiling = profile[i - window * 3]
      if (floor > ceiling - 0.5) continue
      // and the rim has to open onto a surface, not be a one-pixel line
      let holds = true
      for (let k = 1; k <= window; k++) if (profile[i + k] < profile[i] - 2) holds = false
      if (!holds) continue
      if (!best || rise > best.rise) best = { index: i, rise }
    }
    return best === undefined ? undefined : top + best.index
  }
  const tops = new Map<number, number>()
  const hits: boolean[] = []
  for (let x = 0; x < capture.width; x++) {
    const inside = x >= searchFrom - margin && x <= searchTo + margin
    const y = inside ? rimTop(x) : undefined
    hits.push(y !== undefined)
    if (y !== undefined) tops.set(x, y)
  }
  const found = runs(hits, Math.round(20 * sc)).sort(
    (a, b) => b.to - b.from - (a.to - a.from)
  )[0]
  if (!found) return null
  // the capsule's own rim is the highest one in the run: its rounded ends push the rim down
  // near the edges, and anything inside it (a selection indicator's rim) sits lower still. so
  // take a low percentile rather than the median, which would read a corner or an indicator.
  const inRun: number[] = []
  for (let x = found.from; x <= found.to; x++) {
    const y = tops.get(x)
    if (y !== undefined) inRun.push(y)
  }
  inRun.sort((a, b) => a - b)
  return {
    left: capture.pt(found.from),
    right: capture.pt(found.to + 1),
    top: capture.pt(inRun[Math.floor(inRun.length * 0.05)]),
  }
}

export type TabMeasurement = {
  glyph: Box | null
  label: Box | null
  glyphCenterX: number | null
  glyphCenterY: number | null
  labelCenterX: number | null
  /** true when two labels in this capsule run together, so label boundaries came from glyphs */
  labelsTouch: boolean
  badge: Box | null
}

const isBadge = (c: RGB) => c[0] > 110 && c[0] - Math.max(c[1], c[2]) > 45

/**
 * ink inside a capsule, split into per-tab column clusters and then into a glyph band and a
 * label band. independent variable: distance from the capsule's own flat colours. a null
 * result (no clusters) proves the capsule painted no glyphs or labels at all.
 */
export function tabsInCapsule(
  capture: Capture,
  capsule: Box,
  flats: RGB[]
): TabMeasurement[] {
  const sc = capture.scale
  const left = Math.round(capsule.x * sc)
  const right = Math.round((capsule.x + capsule.width) * sc)
  const top = Math.round(capsule.y * sc)
  const bottom = Math.round((capsule.y + capsule.height) * sc)
  // stay off the rounded ends and the rim, which are chrome rather than content
  const inset = Math.round(3 * sc)
  // the capsule is a pill, so an inset RECTANGLE is not inside it. near the top and bottom rows
  // the rounded end curves away and a rectangular inset reaches past it onto whatever the bar is
  // drawn on. that background is not ink by colour either, until it is: over the page it sits 54
  // levels off the glass interior and over the list `More` presents it sits 75, and the ink test
  // is 70. so the corners leaked in on exactly one capture and segmentation reported seven tabs
  // in a five tab bar. mask to the pill instead, which cannot depend on what is behind it.
  const radius = (bottom - top) / 2 - inset
  const midY = (top + bottom) / 2
  const capLeft = left + inset + radius
  const capRight = right - inset - radius
  const insidePill = (x: number, y: number) => {
    const nearestX = Math.min(Math.max(x, capLeft), capRight)
    const dx = x - nearestX
    const dy = y - midY
    return dx * dx + dy * dy <= radius * radius
  }
  const ink: { x: number; y: number; badge: boolean }[] = []
  for (let y = top + inset; y < bottom - inset; y++) {
    for (let x = left + inset; x < right - inset; x++) {
      if (!insidePill(x, y)) continue
      const c = capture.px(x, y)
      if (flats.every((flat) => dist(c, flat) > 70)) ink.push({ x, y, badge: isBadge(c) })
    }
  }
  if (!ink.length) return []
  const content = ink.filter((point) => !point.badge)

  // the glyph row and the label row are one band each, shared by every tab in the capsule. tabs
  // are clustered on the GLYPH band alone, because a long label can run right into its
  // neighbour's label (it overlaps rather than truncating) and would merge two tabs into one.
  const rows = new Array(capture.height).fill(0)
  for (const point of content) rows[point.y]++
  const bands = runs(
    rows.map((count) => count > 0),
    Math.max(1, Math.round(1 * sc))
  )
  const tall = bands.filter((band) => band.to - band.from >= Math.round(14 * sc))
  const glyphBand = tall[0] ?? null
  const labelBand = bands.find((band) => band !== glyphBand && (!glyphBand || band.from > glyphBand.to)) ?? null
  // the band tabs are clustered on: the glyph band when there is one, otherwise the only band
  const clusterBand = glyphBand ?? labelBand

  const clusterColumns = (points: typeof content) => {
    const columns = new Array(capture.width).fill(false)
    for (const point of points) columns[point.x] = true
    const found = runs(columns, Math.round(3 * sc))
    const merged: Run[] = []
    for (const cluster of found) {
      const last = merged[merged.length - 1]
      // a gap under 7pt inside one tab (between a glyph's own strokes) is not a tab boundary
      if (last && cluster.from - last.to < Math.round(7 * sc)) last.to = cluster.to
      else merged.push({ ...cluster })
    }
    return merged
  }
  const inBand = (band: Run | null) =>
    band ? content.filter((point) => point.y >= band.from && point.y <= band.to) : []
  const labelPointsAll = inBand(labelBand)
  const labelClustersAll = clusterColumns(labelPointsAll)
  const clusters = clusterColumns(inBand(clusterBand))
  if (!clusters.length) return []
  // a tab with a title but no systemImage has no glyph to cluster on, so a label cluster that
  // sits between two glyph clusters rather than under one is a tab in its own right. only safe
  // while the labels are still separable; when they run together this cannot be told apart from
  // one label overflowing into the next tab.
  if (glyphBand && labelClustersAll.length >= clusters.length)
    for (const labelCluster of labelClustersAll) {
      const mid = (labelCluster.from + labelCluster.to) / 2
      const covered = clusters.some(
        (cluster) =>
          mid >= cluster.from - Math.round(10 * sc) && mid <= cluster.to + Math.round(10 * sc)
      )
      if (!covered) clusters.push({ ...labelCluster })
    }
  clusters.sort((a, b) => a.from - b.from)

  const box = (points: { x: number; y: number }[]): Box | null => {
    if (!points.length) return null
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const x0 = Math.min(...xs)
    const y0 = Math.min(...ys)
    return {
      x: capture.pt(x0),
      y: capture.pt(y0),
      width: capture.pt(Math.max(...xs) + 1 - x0),
      height: capture.pt(Math.max(...ys) + 1 - y0),
    }
  }
  const centre = (b: Box | null) => (b ? round1(b.x + b.width / 2) : null)
  const middle = (b: Box | null) => (b ? round1(b.y + b.height / 2) : null)

  // labels are split at the midpoints between adjacent glyph clusters. where two labels touch,
  // that boundary comes from the glyphs rather than from the label ink itself, so the label
  // centre is no longer fully independent of the glyph centre; `labelsTouch` says when.
  const bounds = clusters.map((cluster, index) => {
    const from = index === 0 ? left : Math.round((clusters[index - 1].to + cluster.from) / 2)
    const to =
      index === clusters.length - 1
        ? right
        : Math.round((cluster.to + clusters[index + 1].from) / 2)
    return { from, to }
  })
  const labelPoints = labelPointsAll
  const labelsTouch = labelBand !== null && labelClustersAll.length < clusters.length

  const measured: TabMeasurement[] = clusters.map((cluster, index) => {
    const glyph = glyphBand
      ? box(content.filter((p) => p.x >= cluster.from && p.x <= cluster.to && p.y <= glyphBand.to))
      : null
    const label = labelBand
      ? box(
          labelPoints.filter(
            (p) => p.x >= bounds[index].from && p.x <= bounds[index].to
          )
        )
      : null
    return {
      glyph,
      label,
      glyphCenterX: centre(glyph),
      glyphCenterY: middle(glyph),
      labelCenterX: centre(label),
      labelsTouch,
      badge: null,
    }
  })

  // a badge hangs off its glyph's right shoulder and can sit outside that tab's ink columns, so
  // it is found across the whole capsule and then attached to the glyph it belongs to.
  const badges = ink.filter((point) => point.badge)
  if (badges.length) {
    const columns = new Array(capture.width).fill(false)
    for (const point of badges) columns[point.x] = true
    for (const blob of runs(columns, Math.round(2 * sc))) {
      const rect = box(badges.filter((p) => p.x >= blob.from && p.x <= blob.to))
      if (!rect) continue
      let owner = -1
      let bestDistance = Infinity
      for (const [index, tab] of measured.entries()) {
        const center = tab.glyphCenterX ?? tab.labelCenterX
        if (center === null) continue
        const distance = rect.x - center
        if (distance > -4 && distance < bestDistance) {
          bestDistance = distance
          owner = index
        }
      }
      if (owner >= 0) measured[owner].badge = rect
    }
  }
  return measured
}

/**
 * the selection indicator is the capsule's second flat colour: a large contiguous block that
 * is neither the capsule interior nor ink. independent variable: area of the second colour
 * mode. a null result proves the bar drew no indicator, which is what an unselected or
 * minimized bar looks like.
 *
 * "not ink" is measured against the capture's own range rather than a fixed number of levels.
 * the indicator sits near the interior and ink sits far from it, but how far depends on which
 * way round the bar is painted: a light bar has a 237 indicator and black ink 759 away, a dark
 * bar an 18 interior with the indicator 102 away and white ink at 711. a fixed cutoff tuned on
 * the light bar rejected the dark indicator as ink, which left the dark capsule with no second
 * flat colour, and without it every tab's indicator counted as ink and segmentation collapsed
 * to one slot.
 */
export function selectionIndicator(
  capture: Capture,
  capsule: Box,
  interior: RGB
): { rect: Box; color: RGB } | null {
  const sc = capture.scale
  const left = Math.round(capsule.x * sc)
  const right = Math.round((capsule.x + capsule.width) * sc)
  const top = Math.round(capsule.y * sc)
  const bottom = Math.round((capsule.y + capsule.height) * sc)
  // the furthest anything inside the capsule gets from the interior is ink, by definition. a
  // second flat surface has to sit well inside that range, not merely somewhere in it.
  let inkReach = 0
  for (let y = top; y < bottom; y++)
    for (let x = left; x < right; x++)
      inkReach = Math.max(inkReach, dist(capture.px(x, y), interior))
  const surfaceReach = inkReach * 0.25
  const counts = new Map<number, number>()
  for (let y = top; y < bottom; y++)
    for (let x = left; x < right; x++) {
      const c = capture.px(x, y)
      if (dist(c, interior) <= 8) continue
      if (dist(c, interior) > surfaceReach) continue // ink, not a second flat surface
      if (!eroded(capture, x, y, c, Math.max(1, Math.round(sc)))) continue
      const key = (c[0] << 16) | (c[1] << 8) | c[2]
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  let bestKey = -1
  let bestCount = 0
  for (const [key, count] of counts)
    if (count > bestCount) {
      bestKey = key
      bestCount = count
    }
  // a band narrower than a real indicator is antialiasing on the rim, not a surface
  if (bestKey < 0 || bestCount < Math.round(400 * sc * sc)) return null
  const color: RGB = [(bestKey >> 16) & 255, (bestKey >> 8) & 255, bestKey & 255]
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let y = top; y < bottom; y++)
    for (let x = left; x < right; x++)
      if (
        dist(capture.px(x, y), color) <= 10 &&
        eroded(capture, x, y, color, Math.max(1, Math.round(sc)))
      ) {
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x)
        y1 = Math.max(y1, y)
      }
  if (!Number.isFinite(x0)) return null
  return {
    rect: {
      x: capture.pt(x0),
      y: capture.pt(y0),
      width: capture.pt(x1 + 1 - x0),
      height: capture.pt(y1 + 1 - y0),
    },
    color,
  }
}

export type OverflowRow = {
  /** the row's own band, from its top separator to the top of the next one */
  rect: Box
  /** ink left of the separator inset: the row's leading symbol */
  glyph: Box | null
  /** ink between the separator inset and the disclosure chevron */
  label: Box | null
  /** the trailing disclosure chevron, found by position rather than by ordinal */
  chevron: Box | null
  glyphCenterXPt: number | null
  glyphCenterYPt: number | null
  labelLeftPt: number | null
  labelCenterYPt: number | null
  rowCenterYPt: number
}

export type OverflowList = {
  /** the flat colour the list is drawn on */
  background: RGB
  /** the list's own hairlines, top-most first; height is the hairline's own thickness */
  separators: Box[]
  /** hairlines in the band that are not the list's, such as a navigation bar's bottom rule */
  otherRules: Box[]
  separatorInsetLeftPt: number | null
  separatorInsetRightPt: number | null
  rows: OverflowRow[]
  rowPitchPt: (number | null)[]
}

/**
 * the list the More tab presents. independent variable: the separator hairlines, which are the
 * only thing in a plain iOS list that marks a row boundary in pixels. a null result (no
 * hairline anywhere in the search band) proves More presented no list at all, which is what a
 * sheet or a plain page would look like and is worth telling apart from an empty list.
 *
 * rows are bounded by hairlines rather than by ink, so a row with no glyph still has a rect.
 * within a row the separator's own left inset splits leading symbol from label, so neither
 * boundary comes from guessing which cluster is which.
 */
export function overflowList(
  capture: Capture,
  fromPt: number,
  toPt: number
): OverflowList | null {
  const sc = capture.scale
  const from = Math.round(fromPt * sc)
  const to = Math.min(capture.height, Math.round(toPt * sc))

  // the list background is the most common colour in the band, which a hairline a single point
  // tall cannot outvote
  const tally = new Map<string, number>()
  for (let y = from; y < to; y += 2)
    for (let x = 0; x < capture.width; x += 2) {
      const key = capture.px(x, y).join(',')
      tally.set(key, (tally.get(key) ?? 0) + 1)
    }
  const background = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0]
    .split(',')
    .map(Number) as RGB

  // a hairline row is one long run of a single colour that is not the background. requiring the
  // run rather than just a count is what keeps a row of text from passing as a separator.
  type Line = { y: number; from: number; to: number; color: RGB }
  const lines: Line[] = []
  for (let y = from; y < to; y++) {
    const counts = new Map<string, number>()
    for (let x = 0; x < capture.width; x++) {
      const c = capture.px(x, y)
      if (dist(c, background) <= 10) continue
      const key = c.join(',')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (!best || best[1] < capture.width * 0.5) continue
    const color = best[0].split(',').map(Number) as RGB
    const flags = new Array(capture.width)
    for (let x = 0; x < capture.width; x++) flags[x] = dist(capture.px(x, y), color) <= 10
    const run = runs(flags, Math.round(capture.width * 0.5)).sort(
      (a, b) => b.to - b.from - (a.to - a.from)
    )[0]
    if (run) lines.push({ y, from: run.from, to: run.to, color })
  }
  if (!lines.length) return null

  // consecutive hairline rows are one hairline; its thickness is how many rows it spans
  const merged: Box[] = []
  for (const line of lines) {
    const last = merged[merged.length - 1]
    if (last && Math.abs(line.y / sc - (last.y + last.height)) < 0.5) {
      last.height = round1(line.y / sc + 1 / sc - last.y)
      continue
    }
    merged.push({
      x: capture.pt(line.from),
      y: capture.pt(line.y),
      width: capture.pt(line.to + 1 - line.from),
      height: round1(1 / sc),
    })
  }
  // every hairline belonging to one list shares that list's inset, and the hairlines that do
  // not belong to it do not: the navigation bar's own bottom rule spans a different width. so
  // the list is the largest group of hairlines that agree on inset, and a lone rule of some
  // other width is excluded by measurement rather than by a hardcoded y to start below.
  const groups = new Map<string, Box[]>()
  for (const line of merged) {
    const key = `${Math.round(line.x)}:${Math.round(line.width)}`
    groups.set(key, [...(groups.get(key) ?? []), line])
  }
  const separators = [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? []
  if (separators.length < 2) return null
  const separatorInsetLeftPt = separators[0].x
  const separatorInsetRightPt = round1(
    SCREEN_PT.width - (separators[0].x + separators[0].width)
  )

  const box = (points: { x: number; y: number }[]): Box | null => {
    if (!points.length) return null
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const x0 = Math.min(...xs)
    const y0 = Math.min(...ys)
    return {
      x: capture.pt(x0),
      y: capture.pt(y0),
      width: capture.pt(Math.max(...xs) + 1 - x0),
      height: capture.pt(Math.max(...ys) + 1 - y0),
    }
  }

  const rows: OverflowRow[] = []
  for (let index = 0; index + 1 < separators.length; index++) {
    const topSep = separators[index]
    const nextSep = separators[index + 1]
    const rect: Box = {
      x: 0,
      y: topSep.y,
      width: SCREEN_PT.width,
      height: round1(nextSep.y - topSep.y),
    }
    // stay clear of both hairlines and of their antialiasing
    const top = Math.round((topSep.y + topSep.height) * sc) + 1
    const bottom = Math.round(nextSep.y * sc) - 1
    const ink: { x: number; y: number }[] = []
    for (let y = top; y < bottom; y++)
      for (let x = 0; x < capture.width; x++)
        if (dist(capture.px(x, y), background) > 40) ink.push({ x, y })

    const insetX = separatorInsetLeftPt === null ? 0 : separatorInsetLeftPt * sc
    const glyph = box(ink.filter((p) => p.x < insetX - 1))
    // the chevron is the ink nearest the trailing content edge, which the separator gives
    // independently of how wide the label happens to be
    const trailing = (separatorInsetRightPt ?? 0) * sc
    const chevronFrom = capture.width - trailing - Math.round(16 * sc)
    const chevron = box(ink.filter((p) => p.x >= chevronFrom))
    const label = box(ink.filter((p) => p.x >= insetX - 1 && p.x < chevronFrom))
    rows.push({
      rect,
      glyph,
      label,
      chevron,
      glyphCenterXPt: glyph ? round1(glyph.x + glyph.width / 2) : null,
      glyphCenterYPt: glyph ? round1(glyph.y + glyph.height / 2) : null,
      labelLeftPt: label ? label.x : null,
      labelCenterYPt: label ? round1(label.y + label.height / 2) : null,
      rowCenterYPt: round1(rect.y + rect.height / 2),
    })
  }

  return {
    background,
    separators,
    otherRules: merged.filter((line) => !separators.includes(line)),
    separatorInsetLeftPt,
    separatorInsetRightPt,
    rows,
    rowPitchPt: rows.slice(1).map((row, index) => round1(row.rect.y - rows[index].rect.y)),
  }
}
