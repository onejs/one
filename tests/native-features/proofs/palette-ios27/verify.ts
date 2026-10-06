import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { VISUAL_CHECKS, resolveVisualRegion } from '../../scripts/visual-declarations'
import {
  readPng,
  extractCrop,
  countChangedPixels,
  countMatchingPixels,
} from '../../scripts/visual-pixel-gate'

const root = import.meta.dirname
const check = VISUAL_CHECKS.find((entry) => entry.name === 'palette-menu')!
const flatten = (nodes: any[]): any[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children ?? [])])
const samples: Record<string, any> = {}
for (const kind of ['native', 'one']) {
  const snapshot =
    kind === 'one'
      ? gunzipSync(fs.readFileSync(path.join(root, 'one-open.ax.json.gz'))).toString()
      : fs.readFileSync(path.join(root, 'native-open.ax.json'), 'utf8')
  const region = resolveVisualRegion(check, flatten(JSON.parse(snapshot)))
  for (const state of ['open', 'closed']) {
    const crop = extractCrop(readPng(path.join(root, `${kind}-${state}.png`)), region)
    const reading = check.measureSubject(crop)
    const oldCard = countMatchingPixels(
      crop,
      (r, g, b) => r >= 247 && r <= 251 && g >= 247 && g <= 251 && b >= 247 && b <= 251
    )
    const ink = countMatchingPixels(crop, (r, g, b) => r < 60 && g < 60 && b < 60)
    const oldReading = Math.floor(Math.min(ink, oldCard / 10))
    if (state === 'open') {
      assert(reading >= check.minSubjectFloor, `${kind} open palette`)
      assert(oldReading < check.minSubjectFloor, `${kind} rejects old calibration`)
    } else {
      assert(reading < check.minSubjectFloor, `${kind} closed palette must fail`)
    }
    samples[`${kind}-${state}`] = { reading, oldReading, region }
  }
  const diff = countChangedPixels(
    path.join(root, `${kind}-open.png`),
    path.join(root, `${kind}-closed.png`),
    region,
    8
  )
  assert(diff.changed > 0, `${kind} subject crop changes`)
  samples[`${kind}-changed`] = diff
}
const crossRegion = samples['one-open'].region
const matchingCaptures = [
  'native-open',
  'native-closed',
  'one-open',
  'one-closed',
].filter(
  (name) =>
    check.measureSubject(
      extractCrop(readPng(path.join(root, `${name}.png`)), crossRegion)
    ) >= check.minSubjectFloor
)
assert.deepEqual(matchingCaptures, ['native-open', 'one-open'])
samples.crossSubstitution = { total: 4, matchingCaptures }
assert.equal(check.minSubjectFloor, 200)
console.log(
  JSON.stringify({ passed: true, floor: check.minSubjectFloor, samples }, null, 2)
)
