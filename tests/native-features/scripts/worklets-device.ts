// device driver shared by the worklet proofs: accessibility snapshots, taps,
// swipes and screenshots on a claimed iOS simulator, an Android emulator or
// headless Chromium, plus the steps.json/outcome.json receipts.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const args = process.argv.slice(2)
function arg(name: string, fallback = '') {
  const index = args.indexOf(name)
  return index < 0 ? fallback : args[index + 1]
}
export const platform = arg('--platform')
export const device = arg('--device')
export const artifactDir = resolve(
  arg('--artifacts', '/tmp/one-worklets-proof'),
  platform
)
const url = arg('--url', 'http://localhost:8095')
mkdirSync(artifactDir, { recursive: true })
rmSync(resolve(artifactDir, 'outcome.json'), { force: true })
const startedAt = new Date().toISOString()

export type Node = {
  id?: string
  label: string
  x: number
  y: number
  width: number
  height: number
}
// from/to bound the host time of the snapshot that satisfied the step
const history: { step: string; from: number; to: number; nodes: Node[] }[] = []
const run = (command: string, argv: string[]) =>
  execFileSync(command, argv, { encoding: 'utf8', timeout: 30_000 })
const axe = (argv: string[]) => run(arg('--axe', 'axe'), [...argv, '--udid', device])
const adb = (argv: string[]) => run('adb', ['-s', device, ...argv])
const pageErrors: string[] = []

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
let page: Awaited<ReturnType<NonNullable<typeof browser>['newPage']>> | undefined
export function webPage() {
  assert(page, 'web page must be initialized')
  return page
}

export async function open() {
  assert(
    ['ios', 'android', 'web'].includes(platform),
    '--platform ios|android|web required'
  )
  if (platform !== 'web') {
    assert(device, '--device must identify a claimed simulator or owned emulator')
    return
  }
  browser = await chromium.launch({ headless: true })
  page = await browser.newPage({ viewport: { width: 402, height: 874 } })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(url)
}

export async function close() {
  await browser?.close()
}

export async function snapshot(): Promise<Node[]> {
  if (platform === 'web') {
    return webPage()
      .locator('[data-testid]')
      .evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect()
          return {
            id: element.getAttribute('data-testid') ?? undefined,
            label: element.textContent ?? '',
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
          }
        })
      )
  }
  if (platform === 'ios') {
    const result: Node[] = []
    type IOSNode = {
      AXUniqueId?: string
      AXLabel?: string
      frame?: Omit<Node, 'id' | 'label'>
      children?: IOSNode[]
    }
    const visit = (node: IOSNode) => {
      const frame = node.frame
      if (frame)
        result.push({
          id: node.AXUniqueId,
          label: node.AXLabel ?? '',
          ...frame,
        })
      node.children?.forEach(visit)
    }
    const roots = JSON.parse(axe(['describe-ui']))
    assert(Array.isArray(roots), 'iOS accessibility snapshot must be an array')
    roots.forEach(visit)
    return result
  }
  adb(['shell', 'uiautomator', 'dump', '/sdcard/worklets-proof.xml'])
  const xml = adb(['shell', 'cat', '/sdcard/worklets-proof.xml'])
  writeFileSync(resolve(artifactDir, 'latest.xml'), xml)
  return [...xml.matchAll(/<node\b([^>]+)>/g)].map((match) => {
    const attributes = Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((attribute) => [
        attribute[1],
        attribute[2].replaceAll('&amp;', '&'),
      ])
    )
    const bounds = attributes.bounds?.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/)
    assert(bounds, 'Android accessibility node must contain valid bounds')
    const [, left, top, right, bottom] = bounds.map(Number)
    return {
      id: attributes['resource-id'].split('/').at(-1),
      label: attributes.text || attributes['content-desc'],
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    }
  })
}

export async function expectState(
  step: string,
  condition: (nodes: Node[]) => boolean,
  timeout = 20_000
) {
  const deadline = Date.now() + timeout
  let nodes: Node[] = []
  do {
    const from = Date.now()
    nodes = await snapshot()
    const to = Date.now()
    assert.deepEqual(pageErrors, [], 'fixture must have no browser runtime errors')
    if (condition(nodes)) {
      history.push({ step, from, to, nodes })
      writeFileSync(
        resolve(artifactDir, 'steps.json'),
        `${JSON.stringify(history, null, 2)}\n`
      )
      return nodes
    }
    if (platform === 'web') await webPage().waitForTimeout(50)
    else await new Promise((resolve) => setTimeout(resolve, 100))
  } while (Date.now() < deadline)
  throw new Error(`${step} failed: ${JSON.stringify(nodes)}`)
}
export function timing(step: string) {
  const entry = history.find((item) => item.step === step)
  assert(entry, `no recorded step ${step}`)
  return { from: entry.from, to: entry.to }
}
// host epoch ms minus device epoch ms; device timestamps plus this are host time
export function deviceClockOffset() {
  if (platform !== 'android') return 0
  const before = Date.now()
  const deviceNow = Number(adb(['shell', 'date', '+%s%3N']).trim())
  const after = Date.now()
  assert(Number.isFinite(deviceNow), 'Android date must report epoch milliseconds')
  return Math.round((before + after) / 2 - deviceNow)
}
export const byId = (nodes: Node[], id: string) => nodes.find((node) => node.id === id)
export const has = (nodes: Node[], label: string) =>
  nodes.some((node) => node.label === label)
export async function tap(id: string, nodes: Node[]) {
  const node = byId(nodes, id)
  assert(node, `missing ${id}`)
  if (platform === 'web') return webPage().getByTestId(id).click()
  const x = String(Math.round(node.x + node.width / 2))
  const y = String(Math.round(node.y + node.height / 2))
  if (platform === 'ios') axe(['touch', '-x', x, '-y', y, '--down', '--up'])
  else adb(['shell', 'input', 'tap', x, y])
}
// a native touch swipe; web callers drive their own pointer or wheel input
export function swipe(
  start: { x: number; y: number },
  end: { x: number; y: number },
  seconds: number
) {
  assert(platform !== 'web', 'web swipes go through the page')
  const [x1, y1, x2, y2] = [start.x, start.y, end.x, end.y].map((value) =>
    String(Math.round(value))
  )
  if (platform === 'ios')
    axe([
      'swipe',
      '--start-x',
      x1,
      '--start-y',
      y1,
      '--end-x',
      x2,
      '--end-y',
      y2,
      '--duration',
      String(seconds),
    ])
  else
    adb(['shell', 'input', 'swipe', x1, y1, x2, y2, String(Math.round(seconds * 1000))])
}
export async function screenshot(name: string) {
  const file = resolve(artifactDir, `${name}.png`)
  if (platform === 'web') return webPage().screenshot({ path: file })
  if (platform === 'ios') run('xcrun', ['simctl', 'io', device, 'screenshot', file])
  else
    writeFileSync(
      file,
      execFileSync('adb', ['-s', device, 'exec-out', 'screencap', '-p'])
    )
}
export function writeOutcome(extra: Record<string, unknown> = {}) {
  assert.deepEqual(pageErrors, [], 'fixture must have no browser runtime errors')
  writeFileSync(
    resolve(artifactDir, 'outcome.json'),
    `${JSON.stringify(
      {
        passed: true,
        startedAt,
        platform,
        device,
        steps: history.map(({ step }) => step),
        ...extra,
      },
      null,
      2
    )}\n`
  )
}
