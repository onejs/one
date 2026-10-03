// composites transparent docs captures into one hero image per scene: every platform
// side by side at the same point scale, a soft shadow, and the brand yellow behind.
//
//   bun scripts/docs-composite.ts --scene pager --captures <dir> \
//     --out ../../apps/onestack.dev/public/native/pager.webp
//
// reads <captures>/<scene>.ios.png and <scene>.android.png (2x, from docs-capture.ts).
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import sharp, { type OverlayOptions } from 'sharp'

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .flatMap((value, index, all) =>
      value.startsWith('--') ? [[value.slice(2), all[index + 1]]] : []
    )
)
if (!args.scene || !args.captures || !args.out) {
  throw new Error(
    'usage: docs-composite.ts --scene <name> --captures <dir> --out <file.webp>'
  )
}

// every hero shares this canvas, in 2x pixels.
const width = 1600
const height = 1000
const gap = 160
const labelSpace = 72
const yellow = { top: '#f8e14d', bottom: '#f5d90a' }
const shadowTint = { r: 92, g: 74, b: 0 }

const platforms = [
  { key: 'ios', label: 'iOS' },
  { key: 'android', label: 'Android' },
].flatMap((platform) => {
  const file = join(args.captures, `${args.scene}.${platform.key}.png`)
  return existsSync(file) ? [{ ...platform, file }] : []
})
if (!platforms.length)
  throw new Error(`no captures for ${args.scene} in ${args.captures}`)

const subjects = await Promise.all(
  platforms.map(async (platform) => {
    const metadata = await sharp(platform.file).metadata()
    return { ...platform, width: metadata.width!, height: metadata.height! }
  })
)
// one shared factor keeps platforms at the same scale; shrink only to fit.
const fit = Math.min(
  1,
  (width * 0.86 - gap * (subjects.length - 1)) /
    subjects.reduce((sum, subject) => sum + subject.width, 0),
  (height * 0.8 - labelSpace) / Math.max(...subjects.map((subject) => subject.height))
)
const placed = subjects.map((subject) => ({
  ...subject,
  width: Math.round(subject.width * fit),
  height: Math.round(subject.height * fit),
}))
const rowWidth =
  placed.reduce((sum, subject) => sum + subject.width, 0) + gap * (placed.length - 1)
const rowHeight = Math.max(...placed.map((subject) => subject.height))
let x = Math.round((width - rowWidth) / 2)
const top = Math.round((height - rowHeight - labelSpace) / 2)

async function shadow(image: Buffer, blur: number, opacity: number) {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const tinted = Buffer.alloc(data.length)
  for (let i = 0; i < data.length; i += 4) {
    tinted[i] = shadowTint.r
    tinted[i + 1] = shadowTint.g
    tinted[i + 2] = shadowTint.b
    tinted[i + 3] = Math.round(data[i + 3] * opacity)
  }
  const margin = blur * 3
  return sharp(tinted, { raw: info })
    .extend({
      top: margin,
      bottom: margin,
      left: margin,
      right: margin,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .blur(blur)
    .png()
    .toBuffer()
}

const layers: OverlayOptions[] = []
for (const subject of placed) {
  const image = await sharp(subject.file)
    .resize(subject.width, subject.height, { kernel: 'lanczos3' })
    .png()
    .toBuffer()
  const y = top + rowHeight - subject.height
  // a wide ambient shadow plus a tight contact shadow.
  for (const [blur, opacity, drop] of [
    [36, 0.22, 28],
    [6, 0.14, 4],
  ]) {
    layers.push({
      input: await shadow(image, blur, opacity),
      left: x - blur * 3,
      top: y - blur * 3 + drop,
    })
  }
  layers.push({ input: image, left: x, top: y })
  layers.push({
    input: Buffer.from(
      `<svg width="${subject.width}" height="${labelSpace}" xmlns="http://www.w3.org/2000/svg">` +
        `<text x="50%" y="58" text-anchor="middle" font-family="Helvetica Neue, Helvetica, Arial" ` +
        `font-size="30" font-weight="600" letter-spacing="1" fill="#3d3300" fill-opacity="0.55">${subject.label}</text></svg>`
    ),
    left: x,
    top: top + rowHeight,
  })
  x += subject.width + gap
}

const background = Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${yellow.top}"/><stop offset="1" stop-color="${yellow.bottom}"/>` +
    `</linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`
)
await sharp(background).composite(layers).webp({ quality: 90 }).toFile(args.out)
console.log(args.out)
