// captures a docs scene from the running native-features app with a transparent
// background. the docs-capture route alternates its background between pure white and
// pure black; one still frame on each gives exact alpha for every pixel, including
// antialiased edges and translucent fills.
//
//   bun scripts/docs-capture.ts --platform ios --device <udid> --scene pager --out <dir>
//   bun scripts/docs-capture.ts --platform android --device <serial> --scene pager --out <dir>
//
// writes <out>/<scene>.<platform>.png at 2x, whatever the device density.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { docsScenes, type DocsScene, type DocsSceneName } from '../docs-captures/scenes'

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .flatMap((value, index, all) =>
      value.startsWith('--') ? [[value.slice(2), all[index + 1]]] : []
    )
)
const platform = args.platform as 'ios' | 'android'
const device = args.device
const sceneName = args.scene as DocsSceneName
const out = args.out
const scene: DocsScene = docsScenes[sceneName]
if (!['ios', 'android'].includes(platform) || !device || !scene || !out) {
  throw new Error(
    'usage: docs-capture.ts --platform ios|android --device <id> --scene <name> --out <dir>'
  )
}
const adb = `${process.env.ANDROID_HOME ?? `${process.env.HOME}/Library/Android/sdk`}/platform-tools/adb`

function run(command: string, commandArgs: string[]) {
  return execFileSync(command, commandArgs, {
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const shot = join(mkdtempSync(join(tmpdir(), 'docs-capture-')), 'frame.png')

type Frame = { data: Buffer; width: number; height: number }
async function screenshot(): Promise<Frame> {
  let png: Buffer
  if (platform === 'ios') {
    run('xcrun', ['simctl', 'io', device, 'screenshot', '--type=png', shot])
    png = readFileSync(shot)
  } else png = run(adb, ['-s', device, 'exec-out', 'screencap', '-p'])
  const { data, info } = await sharp(png)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

// the frame's background, read from the left edge at mid height where no scene reaches.
function background(frame: Frame) {
  const index = (Math.floor(frame.height / 2) * frame.width + 4) * 4
  const sum = frame.data[index] + frame.data[index + 1] + frame.data[index + 2]
  return sum === 765 ? 'white' : sum === 0 ? 'black' : undefined
}

async function framePair(timeout = 10_000) {
  const frames: Partial<Record<'white' | 'black', Frame>> = {}
  const deadline = Date.now() + timeout
  while (!frames.white || !frames.black) {
    if (Date.now() > deadline) throw new Error('docs-capture background never alternated')
    const frame = await screenshot()
    const kind = background(frame)
    if (kind && !frames[kind]) frames[kind] = frame
    else await sleep(250)
  }
  return frames as Record<'white' | 'black', Frame>
}

// system chrome (home indicator, navigation bar) also adapts to the background, so the
// subject is only looked for between 8% and 92% of the screen height.
function bounds({ white, black }: Record<'white' | 'black', Frame>) {
  let left = white.width
  let top = white.height
  let right = -1
  let bottom = -1
  for (let y = Math.floor(white.height * 0.08); y < white.height * 0.92; y++) {
    for (let x = 0; x < white.width; x++) {
      const i = (y * white.width + x) * 4
      const covered =
        white.data[i] - black.data[i] < 255 ||
        white.data[i + 1] - black.data[i + 1] < 255 ||
        white.data[i + 2] - black.data[i + 2] < 255
      if (!covered) continue
      left = Math.min(left, x)
      right = Math.max(right, x)
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
    }
  }
  if (right < 0) throw new Error('docs-capture found no subject on screen')
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

function sameSubject(a: Frame, b: Frame, box: ReturnType<typeof bounds>) {
  let differing = 0
  for (let y = box.top; y < box.top + box.height; y++) {
    for (let x = box.left; x < box.left + box.width; x++) {
      const i = (y * a.width + x) * 4
      if (
        Math.abs(a.data[i] - b.data[i]) +
          Math.abs(a.data[i + 1] - b.data[i + 1]) +
          Math.abs(a.data[i + 2] - b.data[i + 2]) >
        6
      )
        differing++
    }
  }
  return differing === 0
}

// alpha = 1 - (white - black); color = black / alpha.
async function matte(
  pair: Record<'white' | 'black', Frame>,
  box: ReturnType<typeof bounds>
) {
  const output = Buffer.alloc(box.width * box.height * 4)
  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const i = ((y + box.top) * pair.white.width + x + box.left) * 4
      const o = (y * box.width + x) * 4
      const spread =
        (pair.white.data[i] -
          pair.black.data[i] +
          pair.white.data[i + 1] -
          pair.black.data[i + 1] +
          pair.white.data[i + 2] -
          pair.black.data[i + 2]) /
        3
      const alpha = Math.min(1, Math.max(0, 1 - spread / 255))
      for (let c = 0; c < 3; c++)
        output[o + c] = alpha
          ? Math.min(255, Math.round(pair.black.data[i + c] / alpha))
          : 0
      output[o + 3] = Math.round(alpha * 255)
    }
  }
  return sharp(output, {
    raw: { width: box.width, height: box.height, channels: 4 },
  }).png()
}

// device pixels per point (ios) or per dp (android).
function density(frame: Frame) {
  if (platform === 'android') {
    const output = run(adb, ['-s', device, 'shell', 'wm', 'density']).toString()
    return Number(output.match(/(\d+)\s*$/)![1]) / 160
  }
  const tree = JSON.parse(run('axe', ['describe-ui', '--udid', device]).toString())
  return frame.width / tree[0].frame.width
}

// a held finger: on the simulator each further down event moves it.
function touch(action: 'down' | 'move' | 'up', x: number, y: number) {
  if (platform === 'ios') {
    run('axe', [
      'touch',
      '-x',
      String(x),
      '-y',
      String(y),
      `--${action === 'up' ? 'up' : 'down'}`,
      '--udid',
      device,
    ])
  } else {
    run(adb, [
      '-s',
      device,
      'shell',
      'input',
      'motionevent',
      action.toUpperCase(),
      String(Math.round(x)),
      String(Math.round(y)),
    ])
  }
}

// simulator input takes points; adb takes pixels.
async function hold(box: ReturnType<typeof bounds>, factor: number) {
  const spec = scene.hold!
  const y = (box.top + box.height * spec.y) / factor
  const from = (box.left + box.width * spec.from) / factor
  const to = (box.left + box.width * spec.to) / factor
  touch('down', from, y)
  for (let step = 1; step <= 20; step++)
    touch('move', from + ((to - from) * step) / 20, y)
  await sleep(500)
  return () => touch('up', to, y)
}

const url = `nativefeatures:///docs-capture?scene=${sceneName}`
async function openScene() {
  if (platform === 'ios') {
    run('xcrun', ['simctl', 'openurl', device, url])
    // the simulator may ask before the app opens its own link. the prompt belongs to
    // springboard, so the app's describe-ui cannot see it; axe tap finds it and reports
    // where, and its button only takes a 150 ms press.
    let located: RegExpMatchArray | null = null
    try {
      located = run('axe', [
        'tap',
        '--label',
        'Open',
        '--element-type',
        'Button',
        '--wait-timeout',
        '3',
        '--udid',
        device,
      ])
        .toString()
        .match(/\(([\d.]+), ([\d.]+)\)/)
    } catch {}
    if (located) {
      await sleep(300)
      run('axe', [
        'touch',
        '-x',
        located[1],
        '-y',
        located[2],
        '--down',
        '--up',
        '--delay',
        '0.15',
        '--udid',
        device,
      ])
    }
  } else
    run(adb, [
      '-s',
      device,
      'shell',
      'am',
      'start',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      url,
    ])
  await sleep(2500)
}

// a link sent while the app is still bundling is dropped, so send it again until the
// scene shows.
let rest: Awaited<ReturnType<typeof framePair>> | undefined
for (let attempt = 0; !rest; attempt++) {
  await openScene()
  try {
    rest = await framePair(30_000)
  } catch (error) {
    if (attempt === 3) throw error
  }
}
const scale = density(rest.white)
if (scene.home) {
  if (platform === 'ios') run('axe', ['button', 'home', '--udid', device])
  else run(adb, ['-s', device, 'shell', 'input', 'keyevent', 'KEYCODE_HOME'])
  await sleep(4000)
  const frame = await screenshot()
  // the screen from `top` down, its corners rounded like the device's.
  const top = Math.round(frame.height * scene.home.top)
  const height = frame.height - top
  const radius = Math.round(scene.home.cornerRadius * scale)
  const mask = Buffer.from(
    `<svg width="${frame.width}" height="${height}"><rect width="100%" height="100%" rx="${radius}" ry="${radius}"/></svg>`
  )
  mkdirSync(out, { recursive: true })
  const file = join(out, `${sceneName}.${platform}.png`)
  const rounded = await sharp(frame.data, {
    raw: { width: frame.width, height: frame.height, channels: 4 },
  })
    .extract({ left: 0, top, width: frame.width, height })
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
  await sharp(rounded)
    .resize(Math.round((frame.width * 2) / scale), Math.round((height * 2) / scale), {
      kernel: 'lanczos3',
    })
    .toFile(file)
  console.log(file)
  process.exit(0)
}
// remote images and map tiles arrive after the scene first shows, so wait until two
// frames on the same background match.
for (let settled = false; !settled; ) {
  const next = await framePair()
  settled = sameSubject(rest.white, next.white, bounds(next))
  rest = next
}
let box = bounds(rest)
let pair = rest
if (scene.hold) {
  const release = await hold(box, platform === 'ios' ? scale : 1)
  try {
    pair = await framePair()
    // a third frame on the first background proves nothing moved between the two.
    const again = await framePair()
    if (!sameSubject(pair.white, again.white, box))
      throw new Error('subject moved during hold')
    const held = bounds(pair)
    const left = Math.min(box.left, held.left)
    const top = Math.min(box.top, held.top)
    box = {
      left,
      top,
      width: Math.max(box.left + box.width, held.left + held.width) - left,
      height: Math.max(box.top + box.height, held.top + held.height) - top,
    }
  } finally {
    release()
  }
}
mkdirSync(out, { recursive: true })
const file = join(out, `${sceneName}.${platform}.png`)
await sharp(await (await matte(pair, box)).toBuffer())
  .resize(Math.round((box.width * 2) / scale), Math.round((box.height * 2) / scale), {
    kernel: 'lanczos3',
  })
  .toFile(file)
console.log(file)
