#!/usr/bin/env bun
// Android geometry proof for One.Android.Shape. Run after
// maestro/one-native-android-compose-family.yaml, which ends on the shape
// screen: each of the seven 100dp shapes is drawn #ff0000 from the fixture's
// shared options (radius 1, innerRadius 0.5, verticesCount 5, cornerRounding
// 0.05, topStart/bottomEnd 24dp). Reads each shape's view bounds from the
// accessibility dump, then measures the red fill fraction and red bounding box
// in a native screencap against the analytic geometry of that shape.
//
// Usage:
//   bun tests/native-features/scripts/one-native-android-compose-shapes-proof.ts \
//     --device-id emulator-5554 [--artifact-dir DIR]

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { androidXmlAttributes } from './android-ui-xml'
import { countMatchingPixels, extractCrop, readPng } from './visual-pixel-gate'

const ADB = process.env.ADB ?? 'adb'

let deviceId = ''
let artifactDir = '/tmp/one-native-android-compose-shapes'
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--device-id') deviceId = argv[++i] ?? ''
  else if (argv[i] === '--artifact-dir') artifactDir = argv[++i] ?? artifactDir
  else throw new Error(`unknown argument: ${argv[i]}`)
}
if (!deviceId) throw new Error('--device-id is required')
const artifacts = resolve(artifactDir)
mkdirSync(artifacts, { recursive: true })

const adb = (args: string[]) =>
  execFileSync(ADB, ['-s', deviceId, ...args], { maxBuffer: 64 * 1024 * 1024, timeout: 60_000 })

// outer points start at angle 0, so x spans R cos 144° to R and y spans
// ±R sin 72° of a 2R box. cornerRounding 0.05 of the box is a 0.1R circular
// round, which pulls each point in by 0.1R / sin(half angle) - 0.1R.
const round = 0.1
const pullIn = (halfAngle: number) => round / Math.sin(halfAngle) - round
const pointExtent = (pull: number) => ({
  width: ((1 - pull) * (1 + Math.cos(Math.PI / 5))) / 2,
  height: (1 - pull) * Math.sin((2 * Math.PI) / 5),
})
// a star point runs from (R, 0) to the inner vertex at 36° and 0.5R
const starHalfAngle = Math.atan2(0.5 * Math.sin(Math.PI / 5), 1 - 0.5 * Math.cos(Math.PI / 5))
const star = { fill: (5 * 0.5 * Math.sin(Math.PI / 5)) / 4, ...pointExtent(pullIn(starHalfAngle)) }
type Expect = { fill: number; width: number; height: number }
const circle = Math.PI / 4
const expected: Record<string, Expect> = {
  Star: star,
  // Expo's recipe passes half the view size, which graphics-shapes reads as
  // the half extent: a square pill star with ratio 0.5 is the same star
  PillStar: star,
  Pill: { fill: circle, width: 1, height: 1 },
  Circle: { fill: circle, width: 1, height: 1 },
  Rectangle: { fill: 1 - 4 * (1 - circle) * 0.05 ** 2, width: 1, height: 1 },
  Polygon: { fill: (2.5 * Math.sin((2 * Math.PI) / 5)) / 4, ...pointExtent(pullIn((3 * Math.PI) / 10)) },
  RoundedCorner: { fill: 1 - 2 * (1 - circle) * 0.24 ** 2, width: 1, height: 1 },
}
const FILL_TOLERANCE = 0.04
const EXTENT_TOLERANCE = 0.04

const xml = adb(['exec-out', 'uiautomator', 'dump', '/dev/tty']).toString('utf8')
writeFileSync(resolve(artifacts, 'shapes.xml'), xml)
const png = resolve(artifacts, 'shapes.png')
writeFileSync(png, adb(['exec-out', 'screencap', '-p']))
const image = readPng(png)

const bounds = new Map<string, { x: number; y: number; width: number; height: number }>()
for (const match of xml.matchAll(/<node\b([\s\S]*?)\/?>/g)) {
  const attrs = androidXmlAttributes(match[1])
  const id = (attrs['resource-id'] ?? '').match(/compose-family-shape-(\w+)$/)?.[1]
  const box = (attrs.bounds ?? '').match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/)
  if (!id || !box) continue
  const [left, top, right, bottom] = box.slice(1).map(Number)
  bounds.set(id, { x: left, y: top, width: right - left, height: bottom - top })
}

const isRed = (r: number, g: number, b: number) => r > 200 && g < 80 && b < 80
const failures: string[] = []
const results: Record<string, unknown> = {}
for (const [name, expect] of Object.entries(expected)) {
  const region = bounds.get(name)
  if (!region || region.width < 50 || region.height < 50) {
    failures.push(`${name}: not mounted with a measurable box (${JSON.stringify(region)})`)
    continue
  }
  const crop = extractCrop(image, { ...region, isPixel: true })
  let minX = crop.width
  let maxX = -1
  let minY = crop.height
  let maxY = -1
  const red = countMatchingPixels(crop, (r, g, b, _a, x, y) => {
    if (!isRed(r, g, b)) return false
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
    return true
  })
  const fill = red / (crop.width * crop.height)
  const width = maxX < 0 ? 0 : (maxX - minX + 1) / crop.width
  const height = maxY < 0 ? 0 : (maxY - minY + 1) / crop.height
  // the 24dp corners: topStart and bottomEnd are cut, topEnd and bottomStart stay square
  const corner = (x: number, y: number) => {
    const i = (y * crop.width + x) * 4
    return isRed(crop.data[i], crop.data[i + 1], crop.data[i + 2])
  }
  const corners = {
    topStart: corner(1, 1),
    topEnd: corner(crop.width - 2, 1),
    bottomStart: corner(1, crop.height - 2),
    bottomEnd: corner(crop.width - 2, crop.height - 2),
  }
  results[name] = { region, fill, width, height, corners, expected: expect }
  const line = `${name}: fill ${fill.toFixed(3)} (expect ${expect.fill.toFixed(3)}), extent ${width.toFixed(3)}x${height.toFixed(3)} (expect ${expect.width.toFixed(3)}x${expect.height.toFixed(3)})`
  console.log(line)
  if (Math.abs(fill - expect.fill) > FILL_TOLERANCE) failures.push(`${name}: fill ${line}`)
  if (Math.abs(width - expect.width) > EXTENT_TOLERANCE || Math.abs(height - expect.height) > EXTENT_TOLERANCE)
    failures.push(`${name}: extent ${line}`)
  if (name === 'RoundedCorner') {
    console.log(`RoundedCorner corners: ${JSON.stringify(corners)}`)
    if (corners.topStart || corners.bottomEnd || !corners.topEnd || !corners.bottomStart)
      failures.push(`RoundedCorner: corners ${JSON.stringify(corners)}`)
  }
}

writeFileSync(resolve(artifacts, 'shapes.json'), JSON.stringify({ results, failures }, null, 2))
if (failures.length) {
  console.error(`FAIL one-native-android-compose-shapes\n${failures.join('\n')}`)
  process.exit(1)
}
console.log('PASS one-native-android-compose-shapes 7 shapes')
