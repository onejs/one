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
  crossCheck: {
    /** the rim trace's own horizontal extent, which fades out around the rounded corners */
    rimLeft: number
    rimRight: number
    /** the topmost row that is neither page nor background, found without any gradient */
    membershipTop: number
  }
  /** absolute difference between the two methods on each edge they both produce, points */
  disagreement: { left: number; right: number; top: number }
  interior: RGB
  /** how far the interior sits off the background it is drawn on, summed over channels */
  interiorOverBackground: number
}

/**
 * every capsule in the bar band, left to right. the main capsule is the first, a detached
 * search capsule the second.
 *
 * membership is the whole problem in light mode: the glass interior sits ONE level off the page
 * behind it (253 against 254), while the drop shadow beside it sits ten levels off. so a pixel
 * belongs to the capsule when it either matches the interior's exact flat value or is far enough
 * from the page to be content (an indicator, a glyph, a label). the shadow satisfies neither.
 */
export function capsules(capture: Capture): CapsuleMeasurement[] {
  const sc = capture.scale
  const { bottom } = capture.band
  const found: CapsuleMeasurement[] = []
  let cursor = 0
  while (cursor < capture.width) {
    const rim = rimTrace(capture, cursor, capture.width)
    if (!rim) break
    const rimLeft = Math.round(rim.left * sc)
    const rimRight = Math.round(rim.right * sc)
    const rimTopPx = Math.round(rim.top * sc)
    cursor = rimRight + Math.round(4 * sc)

    // the interior, read 2.5pt inside the rim's left end at roughly half the capsule's height.
    // the selection indicator is inset about 5pt from the capsule's ends even when it is as wide
    // as a single-tab bar, so that strip is the one place inside the capsule it cannot reach.
    const probeX = rimLeft + Math.round(2.5 * sc)
    const firstMidY = rimTopPx + Math.round(30 * sc)
    const interior = capture.px(probeX, firstMidY)
    // the background the bar is drawn on, read at the bottom-left corner of the screen. beside
    // the capsule it cannot be read at all: a five-tab bar reaches within 20pt of the screen
    // edge and its drop shadow covers the rest, which reads as the interior's own value.
    const background = capture.px(Math.round(4 * sc), Math.round(849 * sc))
    // the fixture's page colour is far from the background too, so it has to be excluded by
    // name; without this the upward walk runs straight out of the bar and into the page.
    const page = capture.px(Math.round(3 * sc), Math.round(735 * sc))
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
      crossCheck: {
        rimLeft: rim.left,
        rimRight: rim.right,
            membershipTop: capture.pt(plateauTopPx),
      },
      disagreement: {
        left: round1(Math.abs(rim.left - rect.x)),
        right: round1(Math.abs(rim.right - (rect.x + rect.width))),
        top: round1(Math.abs(capture.pt(plateauTopPx) - rect.y)),
      },
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
  const ink: { x: number; y: number; badge: boolean }[] = []
  for (let y = top + inset; y < bottom - inset; y++) {
    for (let x = left + inset; x < right - inset; x++) {
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
  const counts = new Map<number, number>()
  for (let y = top; y < bottom; y++)
    for (let x = left; x < right; x++) {
      const c = capture.px(x, y)
      if (dist(c, interior) <= 8) continue
      if (dist(c, interior) > 90) continue // ink, not a second flat surface
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
