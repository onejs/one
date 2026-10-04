import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'

const directory = resolve(process.argv[2])
const runtime = JSON.parse(readFileSync(resolve(directory, 'runtime.json'), 'utf8'))
assert.equal(runtime.passed, true, JSON.stringify(runtime))
const colors = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
]
const original = Buffer.alloc(120 * 80 * 4)
for (let y = 0; y < 80; y++)
  for (let x = 0; x < 120; x++) {
    original.set(
      [...colors[(y >= 40 ? 2 : 0) + (x >= 60 ? 1 : 0)], x < 5 ? 0 : 255],
      (y * 120 + x) * 4
    )
  }
const image = () => sharp(original, { raw: { width: 120, height: 80, channels: 4 } })
const checks: Record<string, unknown> = {}
async function compare(name: string, expected: sharp.Sharp, tolerance: number) {
  const actual = await sharp(resolve(directory, name))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const reference = await expected
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  assert.equal(actual.info.width, reference.info.width, name)
  assert.equal(actual.info.height, reference.info.height, name)
  let largest = 0
  // centers of the four quadrants exclude interpolation boundaries.
  for (const y of [
    Math.floor(actual.info.height / 4),
    Math.floor((actual.info.height * 3) / 4),
  ]) {
    for (const x of [
      Math.floor(actual.info.width / 4),
      Math.floor((actual.info.width * 3) / 4),
    ]) {
      const index = (y * actual.info.width + x) * 4
      for (let channel = 0; channel < 4; channel++) {
        largest = Math.max(
          largest,
          Math.abs(actual.data[index + channel] - reference.data[index + channel])
        )
      }
    }
  }
  assert(largest <= tolerance, `${name} pixel delta ${largest} > ${tolerance}`)
  checks[name] = {
    width: actual.info.width,
    height: actual.info.height,
    quadrantPixelDelta: largest,
    tolerance,
  }
}
await compare('png-decoded.png', image(), 0)
await compare(
  'bmp-decoded.png',
  image().flatten({ background: { r: 255, g: 0, b: 0 } }),
  0
)
await compare('jpeg-decoded.png', image().flatten({ background: 'white' }), 12)
await compare(
  'png-crop.png',
  image().extract({ left: 60, top: 0, width: 60, height: 40 }),
  0
)
await compare('png-rotate90.png', image().rotate(90), 0)
await compare('png-stretch.png', image().resize(60, 60, { fit: 'fill' }), 2)
const png = await sharp(resolve(directory, 'png-decoded.png'))
  .ensureAlpha()
  .raw()
  .toBuffer()
assert.equal(png[(20 * 120 + 2) * 4 + 3], 0, 'png keeps transparent strip')
assert.equal(png[(20 * 120 + 10) * 4 + 3], 255, 'png keeps opaque region')
const rotated = await sharp(resolve(directory, 'png-rotate90.png'))
  .ensureAlpha()
  .raw()
  .toBuffer()
assert.equal(
  rotated[(2 * 80 + 20) * 4 + 3],
  0,
  'clockwise rotation moves transparent strip to top'
)
// negative control: an unrotated image compared as the rotated output must fail.
let rejected = false
try {
  await compare('png-rotate90.png', image(), 0)
} catch {
  rejected = true
}
assert(rejected, 'unrotated negative control must fail')
writeFileSync(
  resolve(directory, 'pixels.json'),
  JSON.stringify(
    { passed: true, checks, transparency: true, unrotatedNegativeControlRejected: true },
    null,
    2
  ) + '\n'
)
console.info(
  `${runtime.platform}: native contracts, pixels, transparency and negative control passed`
)
