import fs from 'node:fs'
import { VISUAL_CHECKS, resolveVisualRegion } from '../../scripts/visual-declarations'
import {
  readPng,
  extractCrop,
  countMatchingPixels,
} from '../../scripts/visual-pixel-gate'
const check = VISUAL_CHECKS.find((x) => x.name === 'palette-menu')!
const png = process.argv[2]!
const nodes = JSON.parse(fs.readFileSync(process.argv[3]!, 'utf8'))
const flatten = (ns: any[]): any[] => ns.flatMap((n) => [n, ...flatten(n.children ?? [])])
const region = resolveVisualRegion(check, flatten(nodes))
const crop = extractCrop(readPng(png), region)
const colors: Record<string, number> = {}
for (let i = 0; i < crop.data.length; i += 4) {
  const key = crop.data.slice(i, i + 3).join(',')
  colors[key] = (colors[key] ?? 0) + 1
}
console.log(
  JSON.stringify(
    {
      png,
      region,
      size: [crop.width, crop.height],
      declaredScore: check.measureSubject(crop),
      dark: countMatchingPixels(crop, (r, g, b) => r < 60 && g < 60 && b < 60),
      calibratedCard: countMatchingPixels(
        crop,
        (r, g, b) => r >= 252 && r <= 254 && g >= 252 && g <= 254 && b >= 252 && b <= 254
      ),
      histogram: Object.entries(colors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12),
    },
    null,
    2
  )
)
