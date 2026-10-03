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
const platform = arg('--platform')
const device = arg('--device')
const artifactDir = resolve(arg('--artifacts', '/tmp/one-worklets-proof'), platform)
const url = arg('--url', 'http://localhost:8095')
mkdirSync(artifactDir, { recursive: true })
rmSync(resolve(artifactDir, 'outcome.json'), { force: true })
const startedAt = new Date().toISOString()

type Node = {
  id?: string
  label: string
  x: number
  y: number
  width: number
  height: number
}
const history: { step: string; nodes: Node[] }[] = []
const run = (command: string, argv: string[]) =>
  execFileSync(command, argv, { encoding: 'utf8', timeout: 30_000 })
const axe = (argv: string[]) => run(arg('--axe', 'axe'), [...argv, '--udid', device])
const adb = (argv: string[]) => run('adb', ['-s', device, ...argv])
const pageErrors: string[] = []
function webPage() {
  assert(page, 'web page must be initialized')
  return page
}

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
let page: Awaited<ReturnType<NonNullable<typeof browser>['newPage']>> | undefined

async function snapshot(): Promise<Node[]> {
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

async function expectState(step: string, condition: (nodes: Node[]) => boolean) {
  const deadline = Date.now() + 20_000
  let nodes: Node[] = []
  do {
    nodes = await snapshot()
    assert.deepEqual(pageErrors, [], 'fixture must have no browser runtime errors')
    if (condition(nodes)) {
      history.push({ step, nodes })
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
const byId = (nodes: Node[], id: string) => nodes.find((node) => node.id === id)
const has = (nodes: Node[], label: string) => nodes.some((node) => node.label === label)
async function tap(id: string, nodes: Node[]) {
  const node = byId(nodes, id)
  assert(node, `missing ${id}`)
  if (platform === 'web') return webPage().getByTestId(id).click()
  const x = String(Math.round(node.x + node.width / 2))
  const y = String(Math.round(node.y + node.height / 2))
  if (platform === 'ios') axe(['touch', '-x', x, '-y', y, '--down', '--up'])
  else adb(['shell', 'input', 'tap', x, y])
}
async function screenshot(name: string) {
  const file = resolve(artifactDir, `${name}.png`)
  if (platform === 'web') return webPage().screenshot({ path: file })
  if (platform === 'ios') run('xcrun', ['simctl', 'io', device, 'screenshot', file])
  else
    writeFileSync(
      file,
      execFileSync('adb', ['-s', device, 'exec-out', 'screencap', '-p'])
    )
}

try {
  assert(
    ['ios', 'android', 'web'].includes(platform),
    '--platform ios|android|web required'
  )
  if (platform === 'web') {
    browser = await chromium.launch({ headless: true })
    page = await browser.newPage({ viewport: { width: 402, height: 874 } })
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto(url)
  } else assert(device, '--device must identify a claimed simulator or owned emulator')
  const initial = await expectState(
    'fixture starts without callbacks',
    (nodes) =>
      has(nodes, 'runOnUI: pending') &&
      has(nodes, 'Gesture runtime: pending') &&
      has(nodes, 'Layout: pending') &&
      Boolean(byId(nodes, 'one-native-gestures-box'))
  )
  await screenshot('before')
  const box = byId(initial, 'one-native-gestures-box')
  const layout = byId(initial, 'worklets-layout-box')
  assert(box && layout, 'both fixture views must be mounted')
  const scale = box.width / 72
  const runtime = platform === 'web' ? 'web' : 'ui'
  await tap('worklets-run-ui', initial)
  const ui = await expectState(
    'runOnUI executes on the expected runtime and moves the view',
    (nodes) => {
      const current = byId(nodes, 'one-native-gestures-box')
      return (
        has(nodes, `runOnUI: ${runtime}:40`) &&
        Boolean(current && Math.abs(current.x - box.x - 40 * scale) < 3 * scale)
      )
    }
  )
  await tap('worklets-resize', ui)
  const resized = await expectState(
    'layout animation completes and changes view geometry',
    (nodes) => {
      const current = byId(nodes, 'worklets-layout-box')
      return (
        has(nodes, `Layout: ${runtime}`) &&
        Boolean(current && Math.abs(current.width - layout.width * 2.5) < 3 * scale)
      )
    }
  )
  const current = byId(resized, 'one-native-gestures-box')
  assert(current, 'gesture view must remain mounted')
  const start = {
    x: Math.round(current.x + current.width / 2),
    y: Math.round(current.y + current.height / 2),
  }
  const end = { x: start.x + Math.round(90 * scale), y: start.y }
  if (platform === 'web') {
    await webPage().mouse.move(start.x, start.y)
    await webPage().mouse.down()
    await webPage().mouse.move(end.x, end.y, { steps: 20 })
    await webPage().mouse.up()
  } else if (platform === 'ios')
    axe([
      'swipe',
      '--start-x',
      String(start.x),
      '--start-y',
      String(start.y),
      '--end-x',
      String(end.x),
      '--end-y',
      String(end.y),
      '--duration',
      '0.7',
    ])
  else
    adb([
      'shell',
      'input',
      'swipe',
      String(start.x),
      String(start.y),
      String(end.x),
      String(end.y),
      '700',
    ])
  await expectState(
    'gesture runs on the expected runtime, reports drag and finishes timing',
    (nodes) => {
      const current = byId(nodes, 'one-native-gestures-box')
      const drag = nodes
        .find((node) => /^Drag: -?\d+$/.test(node.label))
        ?.label.match(/-?\d+/)?.[0]
      return (
        has(nodes, `Gesture runtime: ${runtime}`) &&
        has(nodes, 'Animation: finished') &&
        Boolean(drag && Number(drag) >= 65 && Number(drag) <= 110) &&
        Boolean(current && Math.abs(current.x - box.x - 120 * scale) < 3 * scale)
      )
    }
  )
  assert.deepEqual(pageErrors, [], 'fixture must have no browser runtime errors')
  await screenshot('after')
  writeFileSync(
    resolve(artifactDir, 'outcome.json'),
    `${JSON.stringify(
      {
        passed: true,
        startedAt,
        platform,
        device,
        steps: history.map(({ step }) => step),
      },
      null,
      2
    )}\n`
  )
  console.info(`${platform}: all worklet runtime checks passed`)
} finally {
  await browser?.close()
}
