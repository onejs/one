#!/usr/bin/env bun
// reads the measured table and prints what it says about the model rnx's FloatingTabBar uses.
// every line is derived from tab-bar-geometry.json alone; nothing here re-measures a capture.
import fs from 'node:fs'

const table = JSON.parse(
  fs.readFileSync(process.argv[2] ?? 'tests/native-features/oracle/tab-bar-geometry.json', 'utf8')
)
const cells: any[] = table.cells
const by = (id: string) => cells.find((cell) => cell.id === id)
const row = (cell: any) => {
  const main = cell.mainCapsule.rect
  const det = cell.detachedCapsule?.rect
  return [
    cell.id.padEnd(34),
    `main x${String(main.x).padStart(6)} w${String(main.width).padStart(6)} y${main.y} h${main.height}`,
    det ? `detached x${String(det.x).padStart(6)} w${String(det.width).padStart(5)} gap ${cell.detachedGapPt} trail ${cell.detachedTrailingMarginPt}` : `trail ${cell.mainTrailingMarginPt}`,
    `centres ${JSON.stringify(cell.tabCentersPt)}`,
    `pitch ${JSON.stringify(cell.tabPitchPt)}`,
  ].join('  ')
}

console.log('# every cell\n')
for (const cell of cells) console.log(row(cell))

console.log('\n# worst method disagreement per cell (points)\n')
for (const cell of cells) {
  const parts = [cell.mainCapsule, cell.detachedCapsule].filter(Boolean)
  const worst = Math.max(
    ...parts.flatMap((p: any) => Object.values(p.disagreementPt) as number[]),
    ...(cell.tabCenterGlyphVsLabelPt.filter((v: number | null) => v !== null) as number[])
  )
  if (worst > 1) console.log(`${cell.id.padEnd(34)} ${worst}`)
}

console.log('\n# main capsule width against tab count\n')
for (const detached of ['', '-search', '-search-action']) {
  const widths = [1, 2, 3, 4, 5].map((n) => by(`tabs${n}${detached}-sel0-light`)?.mainCapsule.rect.width)
  console.log(`${(detached || '(no detached tab)').padEnd(16)} ${JSON.stringify(widths)}`)
}

console.log('\n# does a long label move the tabs after it?\n')
for (const n of [2, 3, 4, 5]) {
  const short = by(`tabs${n}-sel0-light`)
  const long = by(`tabs${n}-longlabels-sel0-light`)
  if (!short || !long) continue
  console.log(
    `tabs${n}  short ${JSON.stringify(short.tabCentersPt)} width ${short.mainCapsule.rect.width}\n` +
      `       long  ${JSON.stringify(long.tabCentersPt)} width ${long.mainCapsule.rect.width}`
  )
}

console.log('\n# dark twin against its light cell\n')
for (const cell of cells.filter((c) => c.id.endsWith('-dark'))) {
  const twin = by(cell.id.replace(/-dark$/, '-light'))
  if (!twin) continue
  const diff = (a: any, b: any) =>
    ['x', 'y', 'width', 'height'].map((k) => Math.round((a[k] - b[k]) * 10) / 10)
  console.log(
    `${cell.id.padEnd(34)} main ${JSON.stringify(diff(cell.mainCapsule.rect, twin.mainCapsule.rect))}` +
      (cell.detachedCapsule
        ? ` detached ${JSON.stringify(diff(cell.detachedCapsule.rect, twin.detachedCapsule.rect))}`
        : '')
  )
}
