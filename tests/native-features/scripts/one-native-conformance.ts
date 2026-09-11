#!/usr/bin/env bun
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

type Node = {
  AXLabel?: string
  AXUniqueId?: string
  AXValue?: string | number
  AXRole?: string
  role?: string
  subrole?: string
  type?: string
  enabled?: boolean
  frame?: { x: number; y: number; width: number; height: number }
  [key: string]: unknown
}
const suites = [
  'tabs-menu',
  'pickers',
  'forms',
  'sheets',
  'leaves',
  'dialogs',
  'host',
  'containers',
  'popover',
  'accessibility',
  'media',
  'map',
] as const
type Suite = (typeof suites)[number]
type Config = {
  simulatorId: string
  bundleId: string
  artifactDir: string
  timeout: number
  suite: Suite
}

function usage() {
  console.log(
    `Usage: bun tests/native-features/scripts/one-native-conformance.ts --simulator-id <UUID> --bundle-id <BUNDLE_ID> [--suite ${suites.join('|')}] [--artifact-dir <PATH>] [--timeout <MS>]`
  )
}

function parse(args: string[]): Config {
  let simulatorId = ''
  let bundleId = ''
  let artifactDir = '/tmp/one-native-conformance'
  let timeout = 15_000
  let suite: Suite = 'tabs-menu'
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    }
    if (arg === '--simulator-id' || arg === '--simulator-udid')
      simulatorId = args[++i] || ''
    else if (arg === '--bundle-id') bundleId = args[++i] || ''
    else if (arg === '--artifact-dir') artifactDir = args[++i] || ''
    else if (arg === '--timeout') timeout = Number(args[++i])
    else if (arg === '--suite') {
      const value = args[++i] || ''
      if (!(suites as readonly string[]).includes(value))
        throw new Error(`Suite must be one of ${suites.join(', ')}.`)
      suite = value as Suite
    } else throw new Error(`Unknown argument: ${arg}`)
  }
  if (
    !simulatorId ||
    !bundleId ||
    !artifactDir ||
    !Number.isInteger(timeout) ||
    timeout <= 0
  ) {
    throw new Error(
      'A simulator id, bundle id, artifact directory, and positive integer timeout are required.'
    )
  }
  return { simulatorId, bundleId, artifactDir, timeout, suite }
}

function command(args: string[], simulatorId: string) {
  try {
    return execFileSync('xcodebuildmcp', [...args, '--simulator-id', simulatorId], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30_000,
    })
  } catch (error) {
    const result = error as {
      stderr?: Buffer | string
      stdout?: Buffer | string
      message: string
    }
    throw new Error(
      `xcodebuildmcp ${args.join(' ')} failed: ${result.stderr?.toString() || result.stdout?.toString() || result.message}`
    )
  }
}

function snapshot(simulatorId: string): Node[] {
  const output = command(['simulator', 'snapshot-ui'], simulatorId)
  const json = output.match(/```json\s*([\s\S]*?)```/)?.[1] || output
  const nodes: Node[] = []
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(visit)
    if (!value || typeof value !== 'object') return
    const node = value as Node
    if (
      node.AXLabel ||
      node.AXUniqueId ||
      node.AXRole ||
      node.role ||
      node.type ||
      node.frame
    )
      nodes.push(node)
    Object.values(node).forEach(visit)
  }
  visit(JSON.parse(json))
  return nodes
}

const labels = (nodes: Node[]) =>
  nodes.flatMap((node) => (node.AXLabel ? [node.AXLabel] : []))
const has = (nodes: Node[], text: string) =>
  labels(nodes).some((label) => label.includes(text))
const id = (nodes: Node[], value: string) =>
  nodes.find((node) => node.AXUniqueId === value)
const value = (nodes: Node[], expected: string) =>
  labels(nodes).includes(`Value: ${expected}`)
const request = (nodes: Node[], expected: string) =>
  labels(nodes).includes(`Request: ${expected}`)
const fixtureLoaded = (nodes: Node[]) =>
  (has(nodes, 'One Native') && has(nodes, 'Selected:')) ||
  (nodes.some((node) => node.type === 'Application') &&
    labels(nodes).includes('Dismiss context menu'))
const pickersLoaded = (nodes: Node[]) => {
  if (!nodes.some((node) => node.type === 'Application')) return false
  if (labels(nodes).includes('Dismiss context menu'))
    return ['Alpha', 'Beta', 'Gamma'].every((row) => labels(nodes).includes(row))
  if (id(nodes, 'PopoverDismissRegion'))
    return (
      nodes.some((n) => n.AXLabel === 'Month' && n.AXValue === 'September 2026') ||
      (nodes.some((n) => n.AXLabel === 'dismiss popup' && n.type === 'Group') &&
        nodes.every(
          (n) => n.type === 'Application' || n.AXUniqueId === 'PopoverDismissRegion'
        ))
    )
  return (
    has(nodes, 'Value: ') &&
    has(nodes, 'Request: ') &&
    Boolean(id(nodes, 'one-native-control-reject')) &&
    Boolean(id(nodes, 'one-native-control-reset')) &&
    Boolean(id(nodes, 'one-native-control-external')) &&
    Boolean(id(nodes, 'one-native-control-category-color'))
  )
}
const formsLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-control-category-toggle')) &&
  has(nodes, 'Value: ') &&
  has(nodes, 'Request: ')
const sheetsLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  (Boolean(id(nodes, 'one-native-sheet-open')) ||
    Boolean(id(nodes, 'one-native-sheet-close')) ||
    Boolean(id(nodes, 'one-native-sheet-nested-close')))
const leavesLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-leaf-category-button')) &&
  has(nodes, 'Category: ')
const dialogsLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  (Boolean(id(nodes, 'one-native-dialog-category-alert')) ||
    ['Cancel alert', 'Confirm alert', 'Cancel confirmation', 'Confirm confirmation'].some(
      (label) => labels(nodes).includes(label)
    ))
const hostLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-host-expand')) &&
  has(nodes, 'Host: ')
const containersLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-container-extra')) &&
  has(nodes, 'Form: ')
// a presented popover can take the whole accessibility tree, leaving the screen behind
// it out, so the fixture counts as loaded from either side of the presentation.
const accessibilityLoaded = (nodes: Node[]) =>
  labels(nodes).some((label) => label.startsWith('Text: ')) &&
  labels(nodes).includes('Standalone switch')
// a presented Quick Look takes the whole accessibility tree, leaving the fixture behind it
// out, so the fixture counts as loaded from either side of the presentation.
const mediaLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  ((Boolean(id(nodes, 'one-native-media-category-player')) &&
    has(nodes, 'Video bytes: ')) ||
    Boolean(id(nodes, 'QLOverlayDoneButtonAccessibilityIdentifier')))
const mapLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-map-place-ferry')) &&
  has(nodes, 'Place: ')
const popoverLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  ((Boolean(id(nodes, 'one-native-popover-open')) && has(nodes, 'Trigger: ')) ||
    Boolean(id(nodes, 'PopoverDismissRegion')) ||
    labels(nodes).includes('Popover body') ||
    labels(nodes).includes('Section body'))
// the fixture the suite drives, and the home row that reaches it. pickers and forms share
// one screen; tabs-menu drives the One Native hub rather than a control fixture.
const suiteLoaded: Record<Suite, (nodes: Node[]) => boolean> = {
  'tabs-menu': fixtureLoaded,
  pickers: pickersLoaded,
  forms: formsLoaded,
  sheets: sheetsLoaded,
  leaves: leavesLoaded,
  dialogs: dialogsLoaded,
  host: hostLoaded,
  containers: containersLoaded,
  popover: popoverLoaded,
  accessibility: accessibilityLoaded,
  media: mediaLoaded,
  map: mapLoaded,
}
const suiteHome: Record<Suite, string> = {
  'tabs-menu': 'nav-one-native',
  pickers: 'nav-one-native-controls',
  forms: 'nav-one-native-controls',
  sheets: 'nav-one-native-sheet',
  leaves: 'nav-one-native-leaves',
  dialogs: 'nav-one-native-dialogs',
  host: 'nav-one-native-host',
  containers: 'nav-one-native-containers',
  popover: 'nav-one-native-popover',
  accessibility: 'nav-one-native-accessibility',
  media: 'nav-one-native-media',
  map: 'nav-one-native-map',
}
const homeLoaded = (nodes: Node[], suite: Suite) => Boolean(id(nodes, suiteHome[suite]))
const firstState = (nodes: Node[]) =>
  fixtureLoaded(nodes) &&
  has(nodes, 'First tab') &&
  labels(nodes).includes('1') &&
  id(nodes, 'one-native-input-first')?.AXValue === 'Retained'

async function run(config: Config, checks: { name: string; durationMs: number }[]) {
  fs.mkdirSync(config.artifactDir, { recursive: true })
  const wait = async (
    name: string,
    predicate: (nodes: Node[]) => boolean,
    home = false
  ) => {
    const started = Date.now()
    const deadline = started + config.timeout
    let nodes: Node[] = []
    do {
      nodes = snapshot(config.simulatorId)
      const loaded = home
        ? homeLoaded(nodes, config.suite)
        : suiteLoaded[config.suite](nodes)
      if (loaded && predicate(nodes)) {
        checks.push({ name, durationMs: Date.now() - started })
        console.log(`PASS ${name}`)
        return nodes
      }
      await Bun.sleep(250)
    } while (Date.now() < deadline)
    const stem = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const snapshotPath = path.join(config.artifactDir, `fail-${stem}.json`)
    fs.writeFileSync(snapshotPath, JSON.stringify(nodes, null, 2))
    screenshot(`fail-${stem}.png`)
    throw new Error(
      `${name} timed out after ${config.timeout}ms; snapshot: ${snapshotPath}`
    )
  }
  const tap = (target: { id?: string; label?: string }) => {
    if (target.id)
      command(['ui-automation', 'tap', '--id', target.id], config.simulatorId)
    else if (target.label)
      command(['ui-automation', 'tap', '--label', target.label], config.simulatorId)
    else throw new Error('A tap target is required.')
  }
  const point = (x: number, y: number) =>
    command(
      ['ui-automation', 'tap', '-x', String(Math.round(x)), '-y', String(Math.round(y))],
      config.simulatorId
    )
  // the home list scrolls; a row below the fold takes a clamped tap that lands on the
  // wrong route, so bring it fully on screen before tapping it.
  const tapNav = async (testID: string) => {
    await wait(`home lists ${testID}`, (nodes) => Boolean(id(nodes, testID)), true)
    for (let attempt = 0; attempt < 6; attempt++) {
      const nodes = snapshot(config.simulatorId)
      const app = nodes.find((node) => node.type === 'Application')?.frame
      const row = id(nodes, testID)?.frame
      if (!app || !row) throw new Error(`Home row ${testID} disappeared while scrolling`)
      if (row.y >= 0 && row.y + row.height <= app.height) return tap({ id: testID })
      command(
        [
          'ui-automation',
          'swipe',
          '--x1',
          String(Math.round(app.width / 2)),
          '--y1',
          String(Math.round(app.height * 0.75)),
          '--x2',
          String(Math.round(app.width / 2)),
          '--y2',
          String(Math.round(app.height * 0.35)),
          '--duration',
          '0.3',
        ],
        config.simulatorId
      )
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
    throw new Error(`Could not bring ${testID} into view on the home list`)
  }
  const screenshot = (name: string) => {
    const target = path.join(config.artifactDir, name)
    execFileSync('xcrun', ['simctl', 'io', config.simulatorId, 'screenshot', target], {
      stdio: 'inherit',
      timeout: 30_000,
    })
    return target
  }
  const dismissMenu = async () => {
    const nodes = snapshot(config.simulatorId)
    const rows = nodes.filter(
      (node) =>
        [
          'Copy',
          'Checked',
          'Mixed',
          'Bold',
          'Italic',
          'Keep Open',
          'More',
          'Sources',
        ].includes(node.AXLabel ?? '') && node.frame
    )
    if (!rows.length) throw new Error('Expected visible menu rows before dismissal')
    const app = nodes.find((node) => node.type === 'Application')?.frame
    if (!app) throw new Error('Expected application bounds before dismissal')
    const x = app.x + app.width - 10
    const y = app.y + app.height - 100
    if (
      rows.some(
        ({ frame: f }) =>
          x >= f!.x && x <= f!.x + f!.width && y >= f!.y && y <= f!.y + f!.height
      )
    )
      throw new Error('Dismissal point intersects the observed menu')
    point(x, y)
    await wait('menu dismissed', (nodes) => !has(nodes, 'Copy'))
  }
  const dismissWarning = async (home: boolean) => {
    const warning = snapshot(config.simulatorId).find((node) =>
      node.AXLabel?.includes('Open debugger')
    )
    if (!warning) return
    let previousBounds = ''
    const settled = await wait(
      'warning overlay bounds settle',
      (current) => {
        const candidate = current.find((node) => node.AXLabel?.includes('Open debugger'))
        if (!candidate) return true
        const frame = candidate.frame
        const app = current.find((node) => node.type === 'Application')?.frame
        if (!frame || !app || frame.height <= 0 || frame.y + frame.height > app.height)
          return false
        const bounds = JSON.stringify(frame)
        const stable = bounds === previousBounds
        previousBounds = bounds
        return stable
      },
      home
    )
    const frame = settled.find((node) => node.AXLabel?.includes('Open debugger'))?.frame
    if (!frame) return
    point(frame.x + frame.width - 24, frame.y + frame.height / 2)
    await wait(
      'warning overlay dismissed before interaction',
      (current) => !has(current, 'Open debugger'),
      home
    )
  }
  const tapTab = async (x: number, name: string) => {
    const nodes = await wait(`${name} tab bar ready`, (current) => {
      const bar = current.find((node) => node.AXLabel === 'Tab Bar')
      const app = current.find(
        (node) =>
          node.type === 'Application' ||
          node.AXRole === 'AXApplication' ||
          node.role === 'AXApplication'
      )
      return Boolean(
        bar?.frame &&
        app?.frame &&
        Math.round(app.frame.width) === 393 &&
        Math.round(app.frame.height) === 852
      )
    })
    const app = nodes.find(
      (node) =>
        node.type === 'Application' ||
        node.AXRole === 'AXApplication' ||
        node.role === 'AXApplication'
    )!
    if (Math.round(app.frame!.width) !== 393 || Math.round(app.frame!.height) !== 852)
      throw new Error(
        `Expected a 393x852 iPhone 16 display, got ${JSON.stringify(app.frame)}`
      )
    await dismissWarning(false)
    point(x, 783)
  }

  try {
    command(['simulator', 'stop', '--bundle-id', config.bundleId], config.simulatorId)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!/not running/i.test(message)) throw error
    console.log('App was not running.')
  }
  command(['simulator', 'launch-app', '--bundle-id', config.bundleId], config.simulatorId)
  if (config.suite === 'sheets') {
    const retained = (nodes: Node[]) =>
      id(nodes, 'one-native-sheet-counter')?.AXLabel === '1' &&
      id(nodes, 'one-native-sheet-input')?.AXValue === 'Retained'
    const closed = (nodes: Node[], count: number) => {
      const text = labels(nodes)
      return (
        Boolean(id(nodes, 'one-native-sheet-open')) &&
        text.includes('closed') &&
        text[text.indexOf('Dismiss count:') + 1] === String(count)
      )
    }
    const blockDismiss = async (expected: '0' | '1') => {
      const nodes = await wait('sheet dismiss switch ready', (n) =>
        Boolean(id(n, 'one-native-sheet-block-dismiss')?.frame)
      )
      const frame = id(nodes, 'one-native-sheet-block-dismiss')!.frame!
      command(
        [
          'ui-automation',
          'long-press',
          '-x',
          String(Math.round(frame.x + frame.width / 2)),
          '-y',
          String(Math.round(frame.y + frame.height / 2)),
          '--duration',
          '0.15',
        ],
        config.simulatorId
      )
      await wait(
        `interactive dismiss block is ${expected}`,
        (n) => id(n, 'one-native-sheet-block-dismiss')?.AXValue === expected
      )
    }
    const dragSheet = async () => {
      const nodes = await wait('sheet drag surface ready', (n) =>
        n.some((x) => x.AXLabel === 'Sheet Content' && x.frame)
      )
      const frame = nodes.find((n) => n.AXLabel === 'Sheet Content')!.frame!
      const app = nodes.find((n) => n.type === 'Application')!.frame!
      command(
        [
          'ui-automation',
          'swipe',
          '--x1',
          String(Math.round(app.width / 2)),
          '--y1',
          String(Math.round(frame.y - 7)),
          '--x2',
          String(Math.round(app.width / 2)),
          '--y2',
          String(Math.round(app.height - 10)),
          '--duration',
          '0.35',
        ],
        config.simulatorId
      )
    }
    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-sheet')
    await wait('sheet fixture closed', (n) => closed(n, 0))
    tap({ id: 'one-native-sheet-open' })
    await wait('RN sheet content presented', (n) =>
      Boolean(id(n, 'one-native-sheet-increment'))
    )
    screenshot('sheet-open.png')
    tap({ id: 'one-native-sheet-increment' })
    await wait(
      'RN sheet button receives touch',
      (n) => id(n, 'one-native-sheet-counter')?.AXLabel === '1'
    )
    tap({ id: 'one-native-sheet-input' })
    command(['ui-automation', 'type-text', '--text', 'retained'], config.simulatorId)
    await wait('RN sheet input accepts text', retained)
    screenshot('sheet-input.png')
    tap({ id: 'one-native-sheet-close' })
    await wait('sheet close and onDismiss', (n) => closed(n, 1))
    tap({ id: 'one-native-sheet-open' })
    await wait('sheet reopening retains RN local state', retained)
    tap({ id: 'one-native-sheet-nested-open' })
    await wait(
      'nested sheet presents RN content',
      (n) =>
        has(n, 'Nested Sheet Content') && Boolean(id(n, 'one-native-sheet-nested-close'))
    )
    screenshot('sheet-nested.png')
    tap({ id: 'one-native-sheet-nested-close' })
    await wait('nested close restores parent content and state', retained)
    tap({ id: 'one-native-sheet-detents' })
    await wait(
      'fraction detent preserves RN state',
      (n) => retained(n) && has(n, 'Detents: fraction.4')
    )
    screenshot('sheet-fraction.png')
    tap({ id: 'one-native-sheet-detents' })
    await wait(
      'height detent preserves RN state',
      (n) => retained(n) && has(n, 'Detents: height300')
    )
    screenshot('sheet-height.png')
    tap({ id: 'one-native-sheet-close' })
    await wait(
      'height sheet reports actual 300 point RN layout',
      (n) => closed(n, 2) && labels(n).includes('393x300')
    )
    await blockDismiss('1')
    tap({ id: 'one-native-sheet-open' })
    await wait('blocked sheet open', retained)
    await dragSheet()
    await wait('blocked drag preserves sheet', retained)
    tap({ id: 'one-native-sheet-close' })
    await wait('blocked sheet closes programmatically', (n) => closed(n, 3))
    await blockDismiss('0')
    tap({ id: 'one-native-sheet-open' })
    await wait('dismissible sheet open', retained)
    await dragSheet()
    await wait('native dismiss updates React and onDismiss', (n) => closed(n, 4))
    screenshot('sheet-dismissed.png')
    tap({ id: 'one-native-sheet-detents' })
    await wait('restore medium detents before recycling', (n) =>
      labels(n).includes('medium+large')
    )
    tap({ id: 'one-native-sheet-open' })
    await wait('medium sheet reopens with retained state', retained)
    tap({ id: 'one-native-sheet-close' })
    await wait(
      'medium sheet reports its native slot size',
      (n) => closed(n, 5) && labels(n).includes('393x425')
    )
    tap({ id: 'BackButton' })
    await wait('sheet recycle home mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-sheet')
    await wait('sheet recycled fixture is fresh', (n) => closed(n, 0))
    tap({ id: 'one-native-sheet-open' })
    await wait(
      'recycled sheet presents fresh RN content',
      (n) =>
        id(n, 'one-native-sheet-counter')?.AXLabel === '0' &&
        Boolean(id(n, 'one-native-sheet-close'))
    )
    tap({ id: 'one-native-sheet-close' })
    await wait(
      'recycled sheet restores identical detents',
      (n) => closed(n, 1) && labels(n).includes('393x425')
    )
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'forms') {
    const nativeValue = (nodes: Node[], label: string, expected: string | number) =>
      nodes.some((n) => n.AXLabel === label && String(n.AXValue) === String(expected))
    const pressSwitch = async () => {
      const nodes = await wait('native switch is ready', (n) =>
        Boolean(n.find((x) => x.AXLabel === 'Enable notifications' && x.frame))
      )
      const frame = nodes.find((n) => n.AXLabel === 'Enable notifications')!.frame!
      // iOS switch tracking needs a physical press; an instantaneous HID tap never begins tracking.
      command(
        [
          'ui-automation',
          'long-press',
          '-x',
          String(Math.round(frame.x + frame.width - 25)),
          '-y',
          String(Math.round(frame.y + frame.height / 2)),
          '--duration',
          '0.15',
        ],
        config.simulatorId
      )
    }
    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-controls')
    await wait('controls screen mounted', (n) => value(n, 'alpha'))
    tap({ id: 'one-native-control-category-toggle' })
    await wait(
      'toggle mounted on',
      (n) => value(n, 'true') && nativeValue(n, 'Enable notifications', '1')
    )
    await pressSwitch()
    await wait(
      'toggle accepted',
      (n) =>
        value(n, 'false') &&
        request(n, 'false') &&
        nativeValue(n, 'Enable notifications', '0')
    )
    tap({ id: 'one-native-control-reject' })
    await pressSwitch()
    await wait(
      'toggle rejection restores native off',
      (n) =>
        value(n, 'false') &&
        request(n, 'true') &&
        nativeValue(n, 'Enable notifications', '0')
    )
    screenshot('toggle-rejected.png')
    tap({ id: 'one-native-control-reject' })
    tap({ id: 'one-native-control-reset' })
    await wait(
      'toggle revision resets native on',
      (n) => value(n, 'true') && nativeValue(n, 'Enable notifications', '1')
    )
    tap({ id: 'one-native-control-external' })
    await wait(
      'toggle external updates native off',
      (n) => value(n, 'false') && nativeValue(n, 'Enable notifications', '0')
    )
    tap({ id: 'one-native-control-category-stepper' })
    await wait(
      'stepper mounted',
      (n) => value(n, '2') && nativeValue(n, 'Guests, Increment', '2')
    )
    tap({ label: 'Guests, Increment' })
    await wait(
      'stepper accepted',
      (n) => value(n, '3') && request(n, '3') && nativeValue(n, 'Guests, Increment', '3')
    )
    tap({ id: 'one-native-control-reject' })
    tap({ label: 'Guests, Increment' })
    await wait(
      'stepper rejected native value restored',
      (n) => value(n, '3') && request(n, '4') && nativeValue(n, 'Guests, Increment', '3')
    )
    tap({ id: 'one-native-control-reject' })
    tap({ id: 'one-native-control-reset' })
    await wait(
      'stepper revision reset',
      (n) => value(n, '2') && nativeValue(n, 'Guests, Increment', '2')
    )
    tap({ id: 'one-native-control-external' })
    await wait(
      'stepper external update',
      (n) => value(n, '3') && nativeValue(n, 'Guests, Increment', '3')
    )
    for (let next = 4; next <= 10; next++) {
      tap({ label: 'Guests, Increment' })
      await wait(
        `stepper increments to ${next}`,
        (n) => value(n, String(next)) && nativeValue(n, 'Guests, Increment', next)
      )
    }
    screenshot('stepper-upper-bound.png')
    // UIKit reports this AX element enabled even when the plus is disabled; verify the actual boundary behavior.
    tap({ label: 'Guests, Increment' })
    await wait(
      'stepper stays at upper bound',
      (n) =>
        value(n, '10') && request(n, '10') && nativeValue(n, 'Guests, Increment', '10')
    )
    tap({ label: 'Guests, Decrement' })
    await wait(
      'stepper decrements from upper bound',
      (n) => value(n, '9') && request(n, '9') && nativeValue(n, 'Guests, Increment', '9')
    )
    tap({ id: 'one-native-control-category-slider' })
    const nodes = await wait(
      'slider mounted',
      (n) => value(n, '25') && nativeValue(n, 'Volume', 0.25)
    )
    const frame = nodes.find((n) => n.AXLabel === 'Volume')!.frame!
    command(
      [
        'ui-automation',
        'swipe',
        '--x1',
        String(Math.round(frame.x + frame.width * 0.25)),
        '--y1',
        String(Math.round(frame.y + frame.height / 2)),
        '--x2',
        String(Math.round(frame.x + frame.width - 1)),
        '--y2',
        String(Math.round(frame.y + frame.height / 2)),
        '--duration',
        '0.3',
      ],
      config.simulatorId
    )
    await wait(
      'slider drag reaches maximum',
      (n) => value(n, '100') && request(n, '100') && nativeValue(n, 'Volume', 1)
    )
    tap({ id: 'one-native-control-external' })
    await wait(
      'slider external value reaches native',
      (n) => value(n, '50') && nativeValue(n, 'Volume', 0.5)
    )
    tap({ id: 'one-native-control-reject' })
    command(
      [
        'ui-automation',
        'swipe',
        '--x1',
        String(Math.round(frame.x + frame.width * 0.5)),
        '--y1',
        String(Math.round(frame.y + frame.height / 2)),
        '--x2',
        String(Math.round(frame.x + frame.width - 1)),
        '--y2',
        String(Math.round(frame.y + frame.height / 2)),
        '--duration',
        '0.3',
      ],
      config.simulatorId
    )
    await wait(
      'slider rejects native maximum',
      (n) => value(n, '50') && request(n, '100') && nativeValue(n, 'Volume', 0.5)
    )
    tap({ id: 'one-native-control-reject' })
    tap({ id: 'one-native-control-reset' })
    await wait(
      'slider reset reaches native',
      (n) => value(n, '25') && nativeValue(n, 'Volume', 0.25)
    )
    screenshot('form-controls.png')
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'leaves') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    // a SecureField reports as a TextField carrying the AXSecureTextField subrole.
    const field = (nodes: Node[], secure = false) =>
      nodes.find(
        (node) =>
          node.type === 'TextField' && (node.subrole === 'AXSecureTextField') === secure
      )
    // the snapshot exposes no focus flag and the attached hardware keyboard suppresses
    // the software one, so the typed value asserted next is the focus evidence.
    const focus = async (secure = false) => {
      const nodes = await wait('editable native field mounted', (n) =>
        Boolean(field(n, secure)?.frame)
      )
      const bounds = field(nodes, secure)!.frame!
      point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    }
    const type = (text: string) =>
      command(['ui-automation', 'type-text', '--text', text], config.simulatorId)
    const submit = () =>
      command(['ui-automation', 'key-press', '--key-code', '40'], config.simulatorId)
    const indicator = (nodes: Node[], label: string) =>
      nodes.filter((node) => node.AXLabel === label)
    const captureIndicator = (name: string, nodes: Node[]) => {
      // native AX coverage has not been probed for these leaves. Save the actual snapshot
      // with the screenshot; where AX omits values, the assertion proves fixture state only.
      fs.writeFileSync(
        path.join(config.artifactDir, `${name}.json`),
        JSON.stringify(nodes, null, 2)
      )
      screenshot(`${name}.png`)
    }
    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-leaves')
    await wait(
      'fresh Button mounted',
      (n) =>
        status(n, 'Category', 'Button') &&
        status(n, 'Presses', 0) &&
        n.some((x) => x.AXLabel === 'Press leaf' && x.type === 'Button')
    )
    for (let count = 1; count <= 3; count++) {
      tap({ label: 'Press leaf' })
      await wait(`Button emits exactly ${count} presses`, (n) =>
        status(n, 'Presses', count)
      )
    }
    tap({ label: 'Star leaf' })
    await wait('system image Button emits fourth press', (n) => status(n, 'Presses', 4))
    screenshot('button-system-image.png')
    tap({ id: 'one-native-leaf-toggle-disabled' })
    const disabled = await wait(
      'Button disabled natively',
      (n) =>
        status(n, 'Disabled', 'true') &&
        n.some((x) => x.AXLabel === 'Press leaf' && x.enabled === false)
    )
    const bounds = disabled.find((n) => n.AXLabel === 'Press leaf')!.frame!
    point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    // the subsequent React action is an ordering barrier before checking the unchanged count.
    tap({ id: 'one-native-leaf-toggle-role' })
    await wait(
      'disabled tap does not emit',
      (n) =>
        status(n, 'Role', 'destructive') &&
        status(n, 'Presses', 4) &&
        status(n, 'Disabled', 'true')
    )
    tap({ id: 'one-native-leaf-toggle-disabled' })
    await wait(
      'destructive Button enabled and present',
      (n) =>
        status(n, 'Disabled', 'false') &&
        n.some((x) => x.AXLabel === 'Press leaf' && x.enabled === true)
    )
    tap({ label: 'Press leaf' })
    await wait(
      'destructive Button emits fifth press',
      (n) => status(n, 'Role', 'destructive') && status(n, 'Presses', 5)
    )
    await wait('initial automatic Button style', (n) => status(n, 'Style', 'automatic'))
    screenshot('button-automatic.png')
    for (const style of [
      'bordered',
      'borderedProminent',
      'plain',
      'glass',
      'automatic',
    ]) {
      tap({ id: 'one-native-leaf-cycle-style' })
      await wait(
        `Button style ${style}`,
        (n) =>
          status(n, 'Style', style) &&
          n.some((x) => x.AXLabel === 'Press leaf' && x.type === 'Button')
      )
      screenshot(`button-${style}.png`)
    }
    tap({ id: 'one-native-leaf-toggle-role' })
    await wait(
      'Button role cleared',
      (n) => status(n, 'Role', 'unset') && status(n, 'Presses', 5)
    )

    for (const category of ['Progress', 'Gauge'] as const) {
      const nativeLabel = category === 'Progress' ? 'Leaf progress' : 'Leaf gauge'
      tap({ id: `one-native-leaf-category-${category.toLowerCase()}` })
      let previous = await wait(
        `${category} initial zero`,
        (n) =>
          status(n, 'Category', category) &&
          value(n, '0') &&
          status(n, 'Style', 'automatic')
      )
      captureIndicator(`${category.toLowerCase()}-initial`, previous)
      for (const next of category === 'Progress' ? [0.5, 1, 0] : [50, 100, 0]) {
        const before = indicator(previous, nativeLabel)
          .map((n) => n.AXValue)
          .filter((v) => v !== undefined && v !== '')
          .map(String)
        tap({ id: 'one-native-leaf-step' })
        previous = await wait(`${category} value ${next}`, (n) => {
          if (!value(n, String(next))) return false
          // when a native value is exposed, require an actual native change as well.
          const after = indicator(n, nativeLabel)
            .map((x) => x.AXValue)
            .filter((v) => v !== undefined && v !== '')
            .map(String)
          return (
            before.length === 0 ||
            (after.length > 0 && JSON.stringify(after) !== JSON.stringify(before))
          )
        })
        captureIndicator(`${category.toLowerCase()}-${next}`, previous)
      }
      for (const style of category === 'Progress'
        ? ['linear', 'circular', 'automatic']
        : ['linearCapacity', 'accessoryCircular', 'automatic']) {
        tap({ id: 'one-native-leaf-cycle-style' })
        const nodes = await wait(
          `${category} style ${style}`,
          (n) => status(n, 'Style', style) && value(n, '0')
        )
        captureIndicator(`${category.toLowerCase()}-${style}`, nodes)
      }
      if (category === 'Progress') {
        // a determinate ProgressView reports a percentage here; the indeterminate
        // spinner reports a plain animating value instead, so the percentage must go.
        const percentage = (n: Node[]) =>
          indicator(n, nativeLabel).filter((x) => /%$/.test(String(x.AXValue ?? '')))
        await wait('Progress determinate reports a percentage', (n) =>
          Boolean(percentage(n).length)
        )
        tap({ id: 'one-native-leaf-indeterminate' })
        const nodes = await wait(
          'Progress indeterminate drops the determinate percentage',
          (n) =>
            value(n, 'indeterminate') &&
            indicator(n, nativeLabel).length > 0 &&
            percentage(n).length === 0
        )
        captureIndicator('progress-indeterminate', nodes)
        tap({ id: 'one-native-leaf-step' })
        captureIndicator(
          'progress-determinate-again',
          await wait(
            'Progress returns to a determinate percentage',
            (n) => value(n, '0') && percentage(n).length > 0
          )
        )
      }
    }

    tap({ id: 'one-native-leaf-category-text' })
    await wait(
      'TextField starts empty',
      (n) =>
        status(n, 'Category', 'Text') &&
        value(n, '') &&
        status(n, 'Submits', 0) &&
        Boolean(field(n))
    )
    await focus()
    type('leaf')
    await wait(
      'TextField accepts exact text',
      (n) => value(n, 'leaf') && request(n, 'leaf') && field(n)?.AXValue === 'leaf'
    )
    tap({ id: 'one-native-leaf-reject' })
    await wait('TextField rejection enabled', (n) => status(n, 'Reject', 'on'))
    await focus()
    // one character makes the rejected request independent of per-keystroke rollback.
    type('x')
    await wait(
      'TextField rejects and restores native value',
      (n) => value(n, 'leaf') && request(n, 'leafx') && field(n)?.AXValue === 'leaf'
    )
    screenshot('text-rejected.png')
    tap({ id: 'one-native-leaf-external' })
    await wait(
      'TextField external set reaches native while rejecting',
      (n) => value(n, 'outside') && field(n)?.AXValue === 'outside'
    )
    tap({ id: 'one-native-leaf-reset' })
    await wait(
      'TextField revision reset reaches native',
      (n) =>
        value(n, '') &&
        status(n, 'Revision', 1) &&
        field(n)?.AXValue === 'Type a leaf note'
    )
    tap({ id: 'one-native-leaf-reject' })
    await wait('TextField rejection disabled', (n) => status(n, 'Reject', 'off'))
    await focus()
    type('submit')
    await wait(
      'TextField ready to submit',
      (n) =>
        value(n, 'submit') && field(n)?.AXValue === 'submit' && status(n, 'Submits', 0)
    )
    submit()
    await wait(
      'TextField emits exactly one submit',
      (n) => status(n, 'Submits', 1) && value(n, 'submit')
    )
    tap({ id: 'one-native-leaf-axis-toggle' })
    await wait(
      'TextField vertical axis preserves native value',
      (n) => status(n, 'Axis', 'vertical') && field(n)?.AXValue === 'submit'
    )
    screenshot('text-vertical.png')
    tap({ id: 'one-native-leaf-axis-toggle' })
    await wait(
      'TextField horizontal axis preserves native value',
      (n) => status(n, 'Axis', 'horizontal') && field(n)?.AXValue === 'submit'
    )

    tap({ id: 'one-native-leaf-category-secure' })
    await wait(
      'SecureField starts empty',
      (n) =>
        status(n, 'Category', 'Secure') &&
        value(n, 'codes:') &&
        status(n, 'Submits', 0) &&
        Boolean(field(n, true))
    )
    await focus(true)
    type('s3cr3t')
    await wait(
      'SecureField commits exact secret and masks every character',
      (n) =>
        value(n, 'codes:115,51,99,114,51,116') &&
        request(n, 'codes:115,51,99,114,51,116') &&
        field(n, true)?.AXValue === '\u2022'.repeat(6) &&
        !JSON.stringify(n).includes('s3cr3t')
    )
    screenshot('secure-masked.png')
    submit()
    await wait(
      'SecureField emits exactly one submit',
      (n) =>
        status(n, 'Submits', 1) &&
        value(n, 'codes:115,51,99,114,51,116') &&
        !JSON.stringify(n).includes('s3cr3t')
    )

    for (let cycle = 1; cycle <= 2; cycle++) {
      tap({ id: 'BackButton' })
      await wait(`leaves recycle ${cycle}: home mounted`, () => true, true)
      await dismissWarning(true)
      await tapNav('nav-one-native-leaves')
      await wait(
        `leaves recycle ${cycle}: fresh Button state`,
        (n) =>
          status(n, 'Category', 'Button') &&
          status(n, 'Presses', 0) &&
          status(n, 'Disabled', 'false') &&
          status(n, 'Role', 'unset') &&
          status(n, 'Style', 'automatic') &&
          n.some((x) => x.AXLabel === 'Press leaf' && x.type === 'Button')
      )
      tap({ label: 'Press leaf' })
      await wait(`leaves recycle ${cycle}: current Button emitter`, (n) =>
        status(n, 'Presses', 1)
      )
      tap({ id: 'one-native-leaf-category-text' })
      await wait(
        `leaves recycle ${cycle}: fresh TextField state`,
        (n) =>
          status(n, 'Category', 'Text') &&
          value(n, '') &&
          status(n, 'Revision', 0) &&
          status(n, 'Reject', 'off') &&
          status(n, 'Submits', 0) &&
          Boolean(field(n))
      )
      await focus()
      type(`cycle${cycle}`)
      await wait(
        `leaves recycle ${cycle}: current TextField emitter`,
        (n) =>
          value(n, `cycle${cycle}`) &&
          request(n, `cycle${cycle}`) &&
          field(n)?.AXValue === `cycle${cycle}`
      )
      submit()
      await wait(`leaves recycle ${cycle}: current submit emitter`, (n) =>
        status(n, 'Submits', 1)
      )
    }
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'containers') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    const control = (nodes: Node[], type: string, label: string) =>
      nodes.find((node) => node.type === type && node.AXLabel === label)
    const box = (nodes: Node[], label: string) =>
      nodes.find((node) => node.AXLabel === label && node.frame)?.frame
    // iOS switch tracking needs a physical press; an instantaneous HID tap never begins
    // tracking, so a composed Toggle would look like it never emitted.
    const pressSwitch = async () => {
      const nodes = await wait('the form switch is ready', (n) =>
        Boolean(control(n, 'CheckBox', 'Notify')?.frame)
      )
      const frame = control(nodes, 'CheckBox', 'Notify')!.frame!
      command(
        [
          'ui-automation',
          'long-press',
          '-x',
          String(Math.round(frame.x + frame.width - 25)),
          '-y',
          String(Math.round(frame.y + frame.height / 2)),
          '--duration',
          '0.15',
        ],
        config.simulatorId
      )
    }

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-containers')
    // a standalone leaf owns its own hosting controller and reports the height SwiftUI
    // measured, so a zero here means nothing measured at all. the Text fits one line in this
    // narrow box while the Label carries an SF Symbol and wraps onto two, which is exactly
    // what a fixed 24pt leaf height used to clip.
    await wait('standalone Text and Label report a measured height', (n) => {
      const text = Math.round(box(n, 'Standalone text')?.height ?? 0)
      const label = Math.round(box(n, 'Standalone label')?.height ?? 0)
      return text > 0 && label > text && label < text * 3
    })
    // a Form is height-greedy and reports nothing, so it has to fill its Yoga box.
    await wait('a Form fills the box React Native gave it', (n) => status(n, 'Form', 508))
    await wait(
      'a Section renders its rows inside the Form',
      (n) =>
        labels(n).includes('Details') &&
        labels(n).includes('Composed text') &&
        labels(n).includes('Composed label') &&
        Boolean(control(n, 'CheckBox', 'Notify'))
    )
    // a slot carries a React Native subtree into the SwiftUI tree. SwiftUI proposes the
    // box, the shared slot shadow node writes it back to Yoga, and the subtree lays out
    // inside it, so the row sits under the Toggle at the height the slot asked for.
    await wait('a React Native slot renders as a Form row', (n) => {
      const row = id(n, 'one-native-container-slot')?.frame
      const toggle = control(n, 'CheckBox', 'Notify')?.frame
      return Boolean(row && toggle && row.y > toggle.y && Math.round(row.height) === 44)
    })
    screenshot('containers-one-section.png')

    // touches have to reach React Native through the SwiftUI tree that displays it.
    tap({ id: 'one-native-container-slot' })
    await wait('a React Native slot inside a Section takes a tap', (n) =>
      status(n, 'Slot taps', 1)
    )

    await pressSwitch()
    await wait(
      'a control composed two containers deep emits',
      (n) =>
        status(n, 'IsOn', 'true') &&
        String(control(n, 'CheckBox', 'Notify')?.AXValue) === '1'
    )

    // a Section prop change reaches SwiftUI through the published tree, not through any
    // view React Native mounts.
    tap({ id: 'one-native-container-footer' })
    await wait('a Section footer appears', (n) => labels(n).includes('Two of two'))
    tap({ id: 'one-native-container-footer' })
    await wait('and goes away again', (n) => !labels(n).includes('Two of two'))

    tap({ id: 'one-native-container-extra' })
    await wait(
      'a Section mounted later joins the Form',
      (n) => labels(n).includes('More') && Boolean(control(n, 'Button', 'Section button'))
    )
    screenshot('containers-two-sections.png')

    tap({ label: 'Section button' })
    await wait('a Button composed into a Section emits', (n) =>
      status(n, 'Section taps', 1)
    )

    // a Host inside a Section is a container composed into a container.
    await wait('a nested Host lays its children across the row', (n) => {
      const text = box(n, 'In host')
      const button = box(n, 'Host button')
      return Boolean(
        text && button && text.x < button.x && Math.abs(text.y - button.y) < 30
      )
    })
    tap({ label: 'Host button' })
    await wait('a Button inside a nested Host emits', (n) => status(n, 'Host taps', 1))

    // two containers deep, the slot's box comes from a host that is itself composed.
    tap({ id: 'one-native-container-nested-slot' })
    await wait('a React Native slot inside a nested Host takes a tap', (n) =>
      status(n, 'Nested taps', 1)
    )

    tap({ id: 'one-native-container-extra' })
    await wait(
      'removing the Section takes its rows with it',
      (n) =>
        !labels(n).includes('More') &&
        !labels(n).includes('Section button') &&
        !labels(n).includes('Host button') &&
        !id(n, 'one-native-container-nested-slot')
    )

    for (const cycle of [1, 2]) {
      tap({ label: 'index' })
      await wait(`containers recycle ${cycle}: home mounted`, () => true, true)
      await tapNav('nav-one-native-containers')
      await wait(
        `containers recycle ${cycle}: a fresh Form rebuilds`,
        (n) =>
          status(n, 'IsOn', 'false') &&
          labels(n).includes('Details') &&
          labels(n).includes('Composed text')
      )
      await pressSwitch()
      await wait(`containers recycle ${cycle}: the composed Toggle still emits`, (n) =>
        status(n, 'IsOn', 'true')
      )
    }
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'popover') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    const control = (nodes: Node[], type: string, label: string) =>
      nodes.find((node) => node.type === type && node.AXLabel === label)
    // the SwiftUI Button's own ideal height, which is what the trigger measures.
    const triggerHeight = 24
    // iOS dismisses a popover when you tap outside it. that is the only path where the
    // native side changes isPresented on its own, so it is how the controlled protocol
    // gets exercised in this direction.
    const app = () => {
      const frame = snapshot(config.simulatorId).find(
        (node) => node.type === 'Application'
      )?.frame
      if (!frame) throw new Error('The application frame disappeared')
      return frame
    }
    const tapOutside = () => {
      const frame = app()
      point(frame.width / 2, frame.height - 40)
    }
    // the default compact adaptation presents the body as a full-height sheet, which
    // has no outside to tap, so it takes the drag a user would use.
    const dragSheetDown = () => {
      const frame = app()
      command(
        [
          'ui-automation',
          'swipe',
          '--x1',
          String(Math.round(frame.width / 2)),
          '--y1',
          String(Math.round(frame.height * 0.2)),
          '--x2',
          String(Math.round(frame.width / 2)),
          '--y2',
          String(Math.round(frame.height * 0.9)),
          '--duration',
          '0.3',
        ],
        config.simulatorId
      )
    }

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-popover')
    // the trigger is inline content: it lays out with React Native and reports the
    // height SwiftUI measured, the way a host does.
    await wait(
      'the trigger lays out inline and reports its measured height',
      (n) =>
        status(n, 'Trigger', triggerHeight) &&
        Boolean(control(n, 'Button', 'Trigger')) &&
        status(n, 'Open', 'false') &&
        !labels(n).includes('Popover body')
    )
    screenshot('popover-closed.png')

    tap({ id: 'one-native-popover-open' })
    await wait('React presents the popover', (n) => labels(n).includes('Popover body'))
    screenshot('popover-open.png')

    // the body is a React Native subtree presented outside the surface, so its touches
    // arrive through the popover's own touch handler rather than the surface's.
    tap({ id: 'one-native-popover-tap' })
    tap({ id: 'one-native-popover-close' })
    await wait('the presented React Native subtree takes a tap', (n) =>
      status(n, 'Taps', 1)
    )
    await wait(
      'and React dismisses the popover from inside it',
      (n) => status(n, 'Open', 'false') && !labels(n).includes('Popover body')
    )

    tap({ label: 'Trigger' })
    await wait('the composed trigger presents it', (n) =>
      labels(n).includes('Popover body')
    )
    tapOutside()
    await wait(
      'dismissing it natively reaches React',
      (n) => status(n, 'Open', 'false') && !labels(n).includes('Popover body')
    )
    // if that event had been lost React would still hold isPresented true and this
    // request would change nothing.
    tap({ id: 'one-native-popover-open' })
    await wait('so React can present it again', (n) => labels(n).includes('Popover body'))
    tapOutside()
    await wait('and dismiss it again', (n) => !labels(n).includes('Popover body'))

    // a popover is a container, so it composes into a Section like any other. this one
    // takes the default compact adaptation, which on an iPhone is a sheet.
    tap({ id: 'one-native-popover-section-open' })
    await wait('a popover composed into a Section presents', (n) =>
      labels(n).includes('Section body')
    )
    screenshot('popover-section.png')
    dragSheetDown()
    await wait('and dismisses natively', (n) => !labels(n).includes('Section body'))
    tap({ id: 'one-native-popover-section-open' })
    await wait('so it too can present again', (n) => labels(n).includes('Section body'))
    dragSheetDown()
    await wait('and dismisses again', (n) => !labels(n).includes('Section body'))

    for (const cycle of [1, 2]) {
      tap({ label: 'index' })
      await wait(`popover recycle ${cycle}: home mounted`, () => true, true)
      await tapNav('nav-one-native-popover')
      await wait(
        `popover recycle ${cycle}: a fresh trigger measures`,
        (n) =>
          status(n, 'Trigger', triggerHeight) &&
          status(n, 'Open', 'false') &&
          status(n, 'Taps', 0)
      )
      tap({ id: 'one-native-popover-open' })
      await wait(`popover recycle ${cycle}: it still presents`, (n) =>
        labels(n).includes('Popover body')
      )
      tapOutside()
      await wait(`popover recycle ${cycle}: and still dismisses`, (n) =>
        status(n, 'Open', 'false')
      )
    }
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'accessibility') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    const measured = (nodes: Node[], label: string) => {
      const line = labels(nodes).find((text) => text.startsWith(`${label}: `))
      if (!line) throw new Error(`No ${label} measurement on screen`)
      return Number(line.slice(label.length + 2))
    }
    const control = (nodes: Node[], label: string) =>
      nodes.find((node) => node.AXLabel === label)
    // iOS switch tracking needs a physical press; an instantaneous HID tap never begins
    // tracking, so a composed Toggle would look like it never emitted.
    const pressSwitch = (frame: { x: number; y: number; width: number; height: number }) =>
      command(
        [
          'ui-automation',
          'long-press',
          '-x',
          String(Math.round(frame.x + frame.width - 25)),
          '-y',
          String(Math.round(frame.y + frame.height / 2)),
          '--duration',
          '0.15',
        ],
        config.simulatorId
      )

    await tapNav('nav-one-native-accessibility')
    let nodes = await wait('accessibility: the screen mounted', (n) =>
      labels(n).some((label) => label.startsWith('Text: '))
    )

    // a standalone control's own UIView is on screen, so UIKit could have carried these.
    await wait('accessibility: a standalone control carries its label', (n) =>
      labels(n).includes('Standalone switch')
    )
    await wait('accessibility: a standalone control carries its testID', (n) =>
      Boolean(id(n, 'one-native-a11y-standalone'))
    )
    await wait('accessibility: a standalone leaf carries its label', (n) =>
      labels(n).includes('Standalone paragraph')
    )

    // a composed control never joins the view hierarchy, so nothing but the SwiftUI content
    // can be carrying these. this is the case that silently exposed nothing before.
    await wait('accessibility: a composed control carries its label', (n) =>
      labels(n).includes('Composed switch')
    )
    await wait('accessibility: a composed control carries its testID', (n) =>
      Boolean(id(n, 'one-native-a11y-composed'))
    )
    await wait('accessibility: a composed button carries its label', (n) =>
      labels(n).includes('Composed action')
    )
    await wait('accessibility: a control composed into a Form carries its label', (n) =>
      labels(n).includes('Form switch')
    )
    await wait('accessibility: a control composed into a Form carries its testID', (n) =>
      Boolean(id(n, 'one-native-a11y-form'))
    )

    // an accessibility element that is not the real control would pass every check above
    // and do nothing here.
    tap({ label: 'Composed action' })
    await wait('accessibility: the composed button element is the real control', (n) =>
      status(n, 'Taps', 1)
    )
    // a SwiftUI Toggle outside a Form only responds on the switch, so this drives the
    // control from the accessibility node's own frame: a decoy element in the wrong place
    // would miss.
    const composed = control(snapshot(config.simulatorId), 'Composed switch')?.frame
    if (!composed) throw new Error('The composed toggle left the accessibility tree')
    pressSwitch(composed)
    await wait('accessibility: the composed toggle element is the real control', (n) =>
      status(n, 'Host', 'true')
    )
    // SwiftUI owns the composed switch's accessibility value, so this is the control's
    // own state reaching the tree rather than anything React Native supplied.
    await wait('accessibility: a composed control reports its own value', (n) =>
      Boolean(
        n.find((node) => node.AXUniqueId === 'one-native-a11y-composed' && node.AXValue === '1')
      )
    )

    // sizing: no control declares a height any more, so these are SwiftUI's own numbers.
    nodes = snapshot(config.simulatorId)
    const shortText = measured(nodes, 'Text')
    const toggleHeight = measured(nodes, 'Toggle')
    if (!(shortText > 0))
      throw new Error(`A standalone Text measured ${shortText}, so nothing was reported`)
    if (!(toggleHeight > 0))
      throw new Error(`A standalone Toggle measured ${toggleHeight}, so nothing was reported`)
    checks.push({ name: 'accessibility: standalone leaves report a measured height', durationMs: 0 })
    console.log('PASS accessibility: standalone leaves report a measured height')

    // the case a fixed height clipped: this paragraph cannot fit on one line.
    tap({ id: 'one-native-a11y-wrap' })
    const wrapped = await wait('accessibility: wrapping text grows its box', (n) => {
      const line = labels(n).find((text) => text.startsWith('Text: '))
      return Boolean(line) && Number(line!.slice(6)) > shortText
    })
    const wrappedText = measured(wrapped, 'Text')
    if (!(wrappedText > shortText * 2))
      throw new Error(
        `A paragraph that wraps onto several lines measured ${wrappedText} against ${shortText} for one line, so it is still being clipped`
      )
    checks.push({ name: 'accessibility: a wrapped paragraph is not clipped', durationMs: 0 })
    console.log('PASS accessibility: a wrapped paragraph is not clipped')

    // the SwiftUI element has to survive a recycle, because the model is rebuilt on reset.
    tap({ label: 'index' })
    await wait('accessibility: home mounted', () => true, true)
    await tapNav('nav-one-native-accessibility')
    await wait('accessibility: a recycled composed control still carries its label', (n) =>
      labels(n).includes('Composed switch')
    )
    await wait('accessibility: a recycled composed control still carries its testID', (n) =>
      Boolean(id(n, 'one-native-a11y-composed'))
    )
    if (!control(snapshot(config.simulatorId), 'Form switch'))
      throw new Error('A recycled Form lost its composed control')
    checks.push({ name: 'accessibility: a recycled Form keeps its composed control', durationMs: 0 })
    console.log('PASS accessibility: a recycled Form keeps its composed control')

    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'host') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    // the host reports the height SwiftUI measured, so this is the whole contract in
    // one number: a wrong measurement shows up here and nowhere else.
    const size = (nodes: Node[], width: number, height: number) =>
      labels(nodes).includes(`Host: ${width} x ${height}`)
    const control = (nodes: Node[], type: string, label: string) =>
      nodes.find((node) => node.type === type && node.AXLabel === label)
    // iOS switch tracking needs a physical press; an instantaneous HID tap never begins
    // tracking, so a composed Toggle would look like it never emitted.
    const pressSwitch = async () => {
      const nodes = await wait('composed switch is ready', (n) =>
        Boolean(control(n, 'CheckBox', 'Toggle')?.frame)
      )
      const frame = control(nodes, 'CheckBox', 'Toggle')!.frame!
      command(
        [
          'ui-automation',
          'long-press',
          '-x',
          String(Math.round(frame.x + frame.width - 25)),
          '-y',
          String(Math.round(frame.y + frame.height / 2)),
          '--duration',
          '0.15',
        ],
        config.simulatorId
      )
    }

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-host')
    await wait(
      'one composed child measures its own height',
      (n) =>
        size(n, 361, 28) &&
        Boolean(control(n, 'CheckBox', 'Toggle')) &&
        status(n, 'IsOn', 'false') &&
        status(n, 'Changes', 0)
    )
    screenshot('host-one-child.png')

    // the review found by reading that a composed control could render and never emit,
    // because activation was gated on a window it will never get. this is that check.
    await pressSwitch()
    await wait(
      'a composed Toggle emits and React accepts it',
      (n) =>
        status(n, 'IsOn', 'true') &&
        status(n, 'Changes', 1) &&
        String(control(n, 'CheckBox', 'Toggle')?.AXValue) === '1'
    )

    tap({ id: 'one-native-host-expand' })
    await wait(
      'children mounted later grow the host',
      (n) =>
        size(n, 361, 84) &&
        Boolean(control(n, 'Button', 'Composed button')) &&
        Boolean(control(n, 'Button', 'Composed stepper, Increment'))
    )
    screenshot('host-three-children.png')

    tap({ label: 'Composed button' })
    await wait('a composed Button emits', (n) => status(n, 'Taps', 1))
    tap({ label: 'Composed stepper, Increment' })
    tap({ label: 'Composed stepper, Increment' })
    await wait(
      'a composed Stepper emits and the native value follows',
      (n) =>
        status(n, 'Step', 2) &&
        String(control(n, 'Button', 'Composed stepper, Increment')?.AXValue) === '2'
    )

    // a child prop change leaves the host's bounds alone, so nothing in UIKit would
    // schedule a remeasure. measuring from SwiftUI is what catches it.
    tap({ id: 'one-native-host-relabel' })
    await wait(
      'a wrapping label on a composed child regrows the host',
      (n) =>
        size(n, 361, 107) &&
        Boolean(
          control(
            n,
            'CheckBox',
            'Toggle with a much longer label that wraps onto a second line'
          )
        )
    )
    tap({ id: 'one-native-host-relabel' })
    await wait('the shorter label shrinks it back', (n) => size(n, 361, 84))

    tap({ id: 'one-native-host-spacing-20' })
    await wait('spacing adds exactly two gaps', (n) => size(n, 361, 124))
    tap({ id: 'one-native-host-spacing-0' })
    await wait('removing spacing restores the packed height', (n) => size(n, 361, 84))

    tap({ id: 'one-native-host-axis-horizontal' })
    tap({ id: 'one-native-host-expand' })
    await wait('a single horizontal child measures the same', (n) => size(n, 361, 28))
    tap({ id: 'one-native-host-expand' })
    await wait('horizontal children lay out across the row', (n) => {
      const toggle = control(n, 'CheckBox', 'Toggle')?.frame
      const button = control(n, 'Button', 'Composed button')?.frame
      const step = control(n, 'Button', 'Composed stepper, Increment')?.frame
      return Boolean(toggle && button && step && toggle.x < button.x && button.x < step.x)
    })
    screenshot('host-horizontal.png')
    tap({ id: 'one-native-host-axis-vertical' })
    tap({ id: 'one-native-host-expand' })
    await wait('returning to one vertical child restores the height', (n) =>
      size(n, 361, 28)
    )

    for (const cycle of [1, 2]) {
      tap({ label: 'index' })
      await wait(`host recycle ${cycle}: home mounted`, () => true, true)
      await tapNav('nav-one-native-host')
      await wait(
        `host recycle ${cycle}: fresh host measures again`,
        (n) => size(n, 361, 28) && status(n, 'IsOn', 'false') && status(n, 'Changes', 0)
      )
      await pressSwitch()
      await wait(
        `host recycle ${cycle}: composed Toggle still emits`,
        (n) => status(n, 'IsOn', 'true') && status(n, 'Changes', 1)
      )
    }
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'map') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    // MapKit labels its own view 'Map' and publishes each annotation as an element carrying
    // the marker's title, so the markers React sent are readable without a screenshot.
    const surface = (nodes: Node[]) =>
      nodes.find((node) => node.AXLabel === 'Map' && node.frame?.height)
    const regions = (nodes: Node[]) =>
      Number(
        labels(nodes)
          .find((label) => label.startsWith('Regions: '))
          ?.slice('Regions: '.length) ?? -1
      )

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-map')
    await wait(
      'fresh map mounted',
      (n) => status(n, 'Place', 'Ferry') && status(n, 'Pins', 2) && status(n, 'Height', 220)
    )
    // a fill control reports no ideal height, so the box React Native gave it is the only
    // thing that can be deciding this size.
    await wait(
      'Map fills the box React Native gave it',
      (n) => surface(n)?.frame?.height === 220 && surface(n)?.frame?.width === 373
    )
    tap({ id: 'one-native-map-height' })
    await wait(
      'the map follows the box when the style changes',
      (n) => status(n, 'Height', 320) && surface(n)?.frame?.height === 320
    )
    tap({ id: 'one-native-map-height' })
    await wait(
      'the map follows the box back',
      (n) => status(n, 'Height', 220) && surface(n)?.frame?.height === 220
    )
    // the markers prop is an object array, which crosses Fabric as a struct per element.
    // asserting the third one is absent as well as the first two present is what separates
    // "the array arrived" from "some annotation rendered".
    await wait(
      'the markers React sent are on the map',
      (n) => has(n, 'Coit Tower') && has(n, 'Ballpark') && !has(n, 'Pyramid')
    )
    tap({ id: 'one-native-map-pins' })
    await wait(
      'adding a marker adds it to the map',
      (n) => status(n, 'Pins', 3) && has(n, 'Pyramid') && has(n, 'Coit Tower')
    )
    tap({ id: 'one-native-map-pins' })
    await wait(
      'emptying the array removes every marker',
      (n) =>
        status(n, 'Pins', 0) &&
        !has(n, 'Pyramid') &&
        !has(n, 'Coit Tower') &&
        !has(n, 'Ballpark')
    )

    // the camera the fixture seeded is what MapKit settled on, reported back through
    // onRegionChange rather than assumed.
    await wait('the camera reports the place it was seeded with', (n) =>
      status(n, 'Center', '37.80,-122.39')
    )
    const before = regions(snapshot(config.simulatorId))
    tap({ id: 'one-native-map-place-presidio' })
    await wait(
      're-centering moves the camera and reports it',
      (n) => status(n, 'Center', '37.80,-122.47') && regions(n) > before
    )
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'media') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    // the two controls that only exist because the generator reads SwiftUI's overlay
    // modules: VideoPlayer comes from _AVKit_SwiftUI, QuickLook from _QuickLook_SwiftUI.
    const player = (nodes: Node[]) =>
      nodes.find((node) => node.AXLabel === 'Video' && node.frame?.height)
    const elapsed = (nodes: Node[]) =>
      nodes.find((node) => node.AXUniqueId === 'Elapsed Time')?.AXLabel
    const playPause = (nodes: Node[]) =>
      nodes.find((node) => node.AXUniqueId === 'Play/Pause')?.AXLabel
    // AVKit hides the transport overlay a few seconds after it appears, so a single tap can
    // be gone by the time the next snapshot lands. tapping only when the snapshot shows it
    // hidden keeps the tap and the reading in step. the play button covers the middle of
    // the surface, so reveal from the top edge rather than the centre.
    const withTransport = (name: string, predicate: (nodes: Node[]) => boolean) =>
      wait(name, (nodes) => {
        if (playPause(nodes)) return predicate(nodes)
        const frame = player(nodes)?.frame
        if (frame) point(frame.x + frame.width / 2, frame.y + 20)
        return false
      })

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-media')
    // the byte counts are the fixture reading back what it wrote, so they prove both files
    // reached disk before either control was handed a url.
    await wait(
      'fixture wrote both media files',
      (n) =>
        status(n, 'Category', 'Player') &&
        status(n, 'Video bytes', 2653) &&
        status(n, 'Preview bytes', 171) &&
        status(n, 'Autoplay', 'off') &&
        status(n, 'Height', 220)
    )
    // a fill control reports no ideal height, so the box React Native gave it is the only
    // thing that can be deciding this size.
    await wait(
      'VideoPlayer fills the box React Native gave it',
      (n) => player(n)?.frame?.height === 220 && player(n)?.frame?.width === 373
    )
    tap({ id: 'one-native-media-height' })
    await wait(
      'the player follows the box when the style changes',
      (n) => status(n, 'Height', 320) && player(n)?.frame?.height === 320
    )
    tap({ id: 'one-native-media-height' })
    await wait(
      'the player follows the box back',
      (n) => status(n, 'Height', 220) && player(n)?.frame?.height === 220
    )
    await withTransport(
      'the player does not start itself without autoplay',
      (n) => playPause(n) === 'Play' && elapsed(n) === '0:00 elapsed'
    )

    tap({ id: 'one-native-media-autoplay' })
    await wait('autoplay is on for the next mount', (n) => status(n, 'Autoplay', 'on'))
    // autoplay is read when the url loads, so it only takes effect on a fresh player.
    // switching categories unmounts this one and mounts another over the same native view.
    tap({ id: 'one-native-media-category-preview' })
    await wait('QuickLook replaces the player', (n) =>
      Boolean(id(n, 'one-native-media-open'))
    )
    tap({ id: 'one-native-media-category-player' })
    await withTransport(
      'autoplay starts the fresh player',
      (n) => Boolean(elapsed(n)) && elapsed(n) !== '0:00 elapsed'
    )

    tap({ id: 'one-native-media-category-preview' })
    await wait(
      'fresh QuickLook mounted',
      (n) =>
        status(n, 'Category', 'Preview') &&
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 0)
    )
    tap({ id: 'one-native-media-open' })
    // the text search button is QuickLook having resolved the file:// url to a text
    // preview, which a controller presented over a url it could not read would not carry.
    await wait(
      'QuickLook previews the file it was given',
      (n) =>
        Boolean(id(n, 'QLOverlayDoneButtonAccessibilityIdentifier')) &&
        Boolean(id(n, 'QLTextItemViewControllerBarSearchRightButtonAccessibilityIdentifier'))
    )
    tap({ id: 'QLOverlayDoneButtonAccessibilityIdentifier' })
    // dismissal arrives as a nil url, which the control has to report as false rather than
    // leaving React thinking the preview is still up. reading the fixture again at all is
    // what proves the preview went away.
    await wait(
      'dismissing reports back through the binding',
      (n) => status(n, 'Presented', 'false') && status(n, 'Changes', 2)
    )
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'dialogs') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    const dialogButton = (nodes: Node[], label: string) =>
      nodes.some((node) => node.AXLabel === label && node.type === 'Button')
    const alertPresented = (nodes: Node[]) =>
      dialogButton(nodes, 'Cancel alert') && dialogButton(nodes, 'Confirm alert')
    // on iPhone, iOS 26 adapts a confirmation dialog to a popover anchored to the host.
    // that adaptation draws no cancel button; the cancel-role action is raised by tapping
    // outside instead. asserting its absence pins the behavior rather than assuming it.
    const confirmationPresented = (nodes: Node[]) =>
      dialogButton(nodes, 'Confirm confirmation') &&
      !dialogButton(nodes, 'Cancel confirmation') &&
      labels(nodes).includes('dismiss popup')
    const outside = (nodes: Node[]) => {
      const popup = nodes.find((node) => node.AXLabel === 'dismiss popup')?.frame
      if (!popup) throw new Error('Expected a dismissable popup before tapping outside')
      return popup
    }

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-dialogs')
    await wait(
      'fresh Alert mounted',
      (n) =>
        status(n, 'Category', 'Alert') &&
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 0) &&
        status(n, 'Actions', 0) &&
        status(n, 'Last', 'none') &&
        status(n, 'Reject', 'off') &&
        status(n, 'Revision', 0)
    )
    tap({ id: 'one-native-dialog-open' })
    await wait('Alert presents from its zero-size host', alertPresented)
    screenshot('alert-open.png')
    tap({ label: 'Cancel alert' })
    await wait(
      'Alert cancel emits dismissal and cancel action exactly once',
      (n) =>
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 2) &&
        status(n, 'Actions', 1) &&
        status(n, 'Last', 'cancel')
    )
    tap({ id: 'one-native-dialog-open' })
    await wait('Alert reopens for confirm action', alertPresented)
    tap({ label: 'Confirm alert' })
    await wait(
      'Alert confirm emits dismissal and confirm action exactly once',
      (n) =>
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 4) &&
        status(n, 'Actions', 2) &&
        status(n, 'Last', 'confirm')
    )
    tap({ id: 'one-native-dialog-reject' })
    await wait('Alert reject-close mode enabled', (n) => status(n, 'Reject', 'on'))
    tap({ id: 'one-native-dialog-open' })
    await wait('Alert reopens before the refused dismissal', alertPresented)
    tap({ label: 'Cancel alert' })
    // the native side dismissed itself and React refused the change, so the controlled
    // protocol has to roll the native value back and present the alert again. a presented
    // dialog owns the accessibility tree, so the app's own status rows are gone while it
    // is up; their absence is what distinguishes this from a dismissed alert.
    await wait(
      'refused dismissal rolls the native host back to presented',
      (n) =>
        alertPresented(n) && !labels(n).some((label) => label.startsWith('Presented: '))
    )
    screenshot('alert-refused-dismissal.png')
    tap({ label: 'Reset alert revision' })
    await wait(
      'revision reset closes the rolled-back Alert',
      (n) =>
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 7) &&
        status(n, 'Actions', 4) &&
        status(n, 'Last', 'reset') &&
        status(n, 'Revision', 1) &&
        status(n, 'Reject', 'off') &&
        !dialogButton(n, 'Confirm alert')
    )

    tap({ id: 'one-native-dialog-category-confirmation' })
    await wait(
      'fresh ConfirmationDialog mounted',
      (n) =>
        status(n, 'Category', 'Confirmation') &&
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 0) &&
        status(n, 'Actions', 0) &&
        status(n, 'Last', 'none') &&
        status(n, 'Revision', 0) &&
        status(n, 'Title visibility', 'automatic')
    )
    tap({ id: 'one-native-dialog-open' })
    await wait('automatic ConfirmationDialog presents as an anchored popover', (n) =>
      confirmationPresented(n)
    )
    screenshot('confirmation-automatic.png')
    tap({ label: 'Confirm confirmation' })
    await wait(
      'automatic ConfirmationDialog confirm emits exact events',
      (n) =>
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 2) &&
        status(n, 'Actions', 1) &&
        status(n, 'Last', 'confirm')
    )
    tap({ id: 'one-native-dialog-title-visibility' })
    await wait('ConfirmationDialog title visibility is visible', (n) =>
      status(n, 'Title visibility', 'visible')
    )
    tap({ id: 'one-native-dialog-open' })
    const visible = await wait(
      'visible ConfirmationDialog shows its title',
      (n) => confirmationPresented(n) && labels(n).includes('One Native Confirmation')
    )
    screenshot('confirmation-visible.png')
    const popup = outside(visible)
    point(popup.x + popup.width / 2, popup.y + popup.height - 40)
    await wait(
      'outside dismissal raises the cancel-role action exactly once',
      (n) =>
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 4) &&
        status(n, 'Actions', 2) &&
        status(n, 'Last', 'cancel')
    )
    tap({ id: 'one-native-dialog-title-visibility' })
    await wait('ConfirmationDialog title visibility is hidden', (n) =>
      status(n, 'Title visibility', 'hidden')
    )
    tap({ id: 'one-native-dialog-open' })
    await wait(
      'hidden ConfirmationDialog presents without its title',
      (n) => confirmationPresented(n) && !labels(n).includes('One Native Confirmation')
    )
    screenshot('confirmation-hidden.png')
    tap({ label: 'Confirm confirmation' })
    await wait(
      'hidden ConfirmationDialog confirm emits exact events',
      (n) =>
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 6) &&
        status(n, 'Actions', 3) &&
        status(n, 'Last', 'confirm')
    )

    for (let cycle = 1; cycle <= 2; cycle++) {
      tap({ id: 'BackButton' })
      await wait(`dialogs recycle ${cycle}: home mounted`, () => true, true)
      await dismissWarning(true)
      await tapNav('nav-one-native-dialogs')
      await wait(
        `dialogs recycle ${cycle}: fresh Alert state`,
        (n) =>
          status(n, 'Category', 'Alert') &&
          status(n, 'Presented', 'false') &&
          status(n, 'Changes', 0) &&
          status(n, 'Actions', 0) &&
          status(n, 'Last', 'none') &&
          status(n, 'Reject', 'off') &&
          status(n, 'Revision', 0)
      )
      tap({ id: 'one-native-dialog-open' })
      await wait(`dialogs recycle ${cycle}: Alert presents`, alertPresented)
      tap({ label: 'Confirm alert' })
      await wait(
        `dialogs recycle ${cycle}: fresh action emits once`,
        (n) =>
          status(n, 'Presented', 'false') &&
          status(n, 'Changes', 2) &&
          status(n, 'Actions', 1) &&
          status(n, 'Last', 'confirm')
      )
    }
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'pickers') {
    // the segmented control is the only wide short TabGroup on the screen, and the tap has to
    // land on the node the wait actually matched. finding a TabGroup again without the bounds
    // would aim at whichever one came first and grade something else.
    const segmented = (nodes: Node[]) =>
      nodes.find(
        (node) =>
          node.type === 'TabGroup' &&
          node.frame &&
          node.frame.width > 300 &&
          node.frame.height >= 25 &&
          node.frame.height <= 44
      )?.frame
    const tapSegment = async (index: number, name: string) => {
      const nodes = await wait(name, (current) => Boolean(segmented(current)))
      const frame = segmented(nodes)
      if (!frame) throw new Error('Expected TabGroup bounds')
      point(
        Math.round(frame.x + (frame.width * (index + 0.5)) / 3),
        Math.round(frame.y + frame.height / 2)
      )
    }
    // one matcher for the wheel, so a tap always lands on the node the wait matched. a bare
    // `type === 'Slider'` lookup would take whichever slider came first and grade that instead.
    const wheel = (nodes: Node[], index: number) =>
      nodes.find(
        (node) =>
          node.type === 'Slider' &&
          Number(node.AXValue) === index &&
          node.frame &&
          Math.round(node.frame.height) === 216
      )?.frame
    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-controls')
    await wait(
      'segmented picker mounted',
      (nodes) => value(nodes, 'alpha') && nodes.some((node) => node.type === 'TabGroup')
    )
    screenshot('picker-segmented.png')
    await tapSegment(1, 'segmented picker has three-option bounds')
    await wait(
      'segmented selection updates React',
      (nodes) => value(nodes, 'beta') && request(nodes, 'beta')
    )
    tap({ id: 'one-native-control-reject' })
    await tapSegment(2, 'rejected segmented picker has three-option bounds')
    await wait(
      'segmented rejection preserves controlled beta',
      (nodes) => value(nodes, 'beta') && request(nodes, 'gamma')
    )
    screenshot('picker-rejected.png')
    tap({ id: 'one-native-control-reject' })
    tap({ id: 'one-native-control-reset' })
    await wait('revision resets selection to alpha', (nodes) => value(nodes, 'alpha'))
    tap({ id: 'one-native-control-external' })
    await wait('external selection changes beta', (nodes) => value(nodes, 'beta'))
    tap({ id: 'one-native-control-style' })
    await wait('menu picker mounted', (nodes) =>
      labels(nodes).includes('Style: menu · Reject: off')
    )
    tap({ label: 'Favorite Greek letter, Beta' })
    await wait('menu picker options presented', (nodes) =>
      ['Alpha', 'Beta', 'Gamma'].every((row) => labels(nodes).includes(row))
    )
    tap({ label: 'Gamma' })
    await wait(
      'menu picker change',
      (nodes) =>
        value(nodes, 'gamma') &&
        request(nodes, 'gamma') &&
        labels(nodes).includes('Favorite Greek letter, Gamma')
    )
    tap({ id: 'one-native-control-style' })
    const wheeled = await wait(
      'wheel picker mounts',
      (nodes) =>
        labels(nodes).includes('Style: wheel · Reject: off') && Boolean(wheel(nodes, 2))
    )
    screenshot('picker-wheel.png')
    const slider = wheel(wheeled, 2)
    if (!slider) throw new Error('Expected wheel Slider bounds height 216')
    point(
      Math.round(slider.x + slider.width / 2),
      Math.round(slider.y + slider.height / 2 - 32)
    )
    await wait(
      'wheel native selection changes beta',
      (nodes) => value(nodes, 'beta') && request(nodes, 'beta') && Boolean(wheel(nodes, 1))
    )
    tap({ id: 'one-native-control-style' })
    await wait(
      'inline picker mounts',
      (nodes) =>
        labels(nodes).includes('Style: inline · Reject: off') &&
        nodes.some(
          (node) =>
            node.type === 'Slider' && node.frame && Math.round(node.frame.height) === 216
        )
    )
    screenshot('picker-inline.png')
    tap({ id: 'one-native-control-category-date' })
    await wait(
      'compact date mounted',
      (n) =>
        value(n, '2026-09-10T12:00:00.000Z') &&
        n.some((x) => x.AXLabel === 'Date Picker' && x.AXValue === 'Sep 10, 2026')
    )
    tap({ label: 'Date Picker' })
    const calendar = await wait('compact calendar presented', (n) =>
      n.some((x) => x.AXLabel === 'Month' && x.AXValue === 'September 2026')
    )
    const tomorrow = calendar.find(
      (n) => n.type === 'Button' && n.AXLabel?.endsWith(', September 11')
    )
    if (!tomorrow?.AXLabel)
      throw new Error('September 11 is missing from the native calendar')
    screenshot('date-compact.png')
    tap({ label: tomorrow.AXLabel })
    const popup = snapshot(config.simulatorId)
    const app = popup.find((n) => n.type === 'Application')!.frame!
    const dismissal = { x: app.x + app.width - 10, y: app.y + app.height - 100 }
    if (
      popup.some(
        (n) =>
          n.type === 'Button' &&
          n.AXUniqueId !== 'PopoverDismissRegion' &&
          n.frame &&
          dismissal.x >= n.frame.x &&
          dismissal.x <= n.frame.x + n.frame.width &&
          dismissal.y >= n.frame.y &&
          dismissal.y <= n.frame.y + n.frame.height
      )
    )
      throw new Error('Calendar dismissal point intersects native content')
    point(dismissal.x, dismissal.y)
    await wait(
      'compact date sends Date value',
      (n) =>
        value(n, '2026-09-11T12:00:00.000Z') && request(n, '2026-09-11T12:00:00.000Z')
    )
    tap({ id: 'one-native-control-style' })
    const graphical = await wait(
      'graphical date mounts',
      (n) =>
        has(n, 'Style: graphical') &&
        n.some((x) => x.type === 'Group' && x.AXLabel === 'Date')
    )
    const group = graphical.find(
      (n) => n.type === 'Group' && n.AXLabel === 'Date'
    )!.frame!
    if (Math.round(group.width) !== 373 || Math.round(group.height) !== 378)
      throw new Error(
        'Graphical calendar geometry differs from the calibrated iOS 26.4 fixture'
      )
    screenshot('date-graphical.png')
    // the AX snapshot omits calendar cells; this fixture uses September 2026 on the calibrated iPhone display.
    point(group.x + (group.width * 6.5) / 7, group.y + 173)
    await wait(
      'graphical date selection',
      (n) =>
        value(n, '2026-09-12T12:00:00.000Z') && request(n, '2026-09-12T12:00:00.000Z')
    )
    tap({ id: 'one-native-control-style' })
    const dateWheel = await wait(
      'date wheel mounts',
      (n) => has(n, 'Style: wheel') && n.filter((x) => x.type === 'Slider').length === 3
    )
    screenshot('date-wheel.png')
    const columns = dateWheel
      .filter((n) => n.type === 'Slider')
      .sort((a, b) => a.frame!.x - b.frame!.x)
    const day = columns[1].frame!
    point(day.x + day.width / 2, day.y + day.height / 2 + 32)
    await wait(
      'date wheel changes day',
      (n) =>
        value(n, '2026-09-13T12:00:00.000Z') && request(n, '2026-09-13T12:00:00.000Z')
    )
    tap({ id: 'one-native-control-category-color' })
    const color = await wait(
      'color picker mounted',
      (n) => value(n, '#3366FF') && n.some((x) => x.AXLabel === 'Accent color')
    )
    const well = color.find((n) => n.AXLabel === 'Accent color')!.frame!
    point(well.x + well.width - well.height / 2, well.y + well.height / 2)
    const colors = await wait(
      'color palette presented',
      (n) =>
        n.some((x) => x.AXLabel === 'dismiss popup' && x.type === 'Group') &&
        !has(n, 'Value: ')
    )
    const colorApp = colors.find((n) => n.type === 'Application')!.frame!
    if (colorApp.width !== 393 || colorApp.height !== 852)
      throw new Error('Color palette coordinates require the calibrated 393x852 display')
    screenshot('color-picker.png')
    // UIKit's color popup exposes only its dismiss group to this snapshot API.
    point(150, 768)
    point(359, 277)
    await wait(
      'color palette sends opaque black RGBA',
      (n) => value(n, '#000000FF') && request(n, '#000000FF')
    )
    tap({ id: 'one-native-control-category-picker' })
    const recycled = await wait(
      'recycled picker restores identical options',
      (n) => value(n, 'beta') && Boolean(wheel(n, 1))
    )
    const recycledWheel = wheel(recycled, 1)
    if (!recycledWheel) throw new Error('Expected recycled wheel Slider bounds height 216')
    point(
      recycledWheel.x + recycledWheel.width / 2,
      recycledWheel.y + recycledWheel.height / 2 + 32
    )
    await wait(
      'recycled picker sends current callback',
      (n) => value(n, 'gamma') && request(n, 'gamma') && Boolean(wheel(n, 2))
    )

    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  await wait('home screen mounted', () => true, true)
  await dismissWarning(true)
  await tapNav('nav-one-native')
  await wait(
    'initial fixture state',
    (n) =>
      has(n, 'First tab') &&
      has(n, 'Checked: on') &&
      has(n, 'Mixed: true,false') &&
      has(n, 'Search: off')
  )
  await wait('centered menu trigger', (n) => {
    const trigger = n.find((node) => node.AXLabel === 'Open native menu')
    return Boolean(
      trigger?.frame &&
      trigger.frame.width > 0 &&
      trigger.frame.height > 0 &&
      Math.abs(trigger.frame.x + trigger.frame.width / 2 - 196.5) < 28
    )
  })
  screenshot('01-centered-trigger.png')

  tap({ id: 'one-native-increment-first' })
  tap({ id: 'one-native-input-first' })
  command(['ui-automation', 'type-text', '--text', 'retained'], config.simulatorId)
  await wait('counter and input retain local state', firstState)
  tap({ id: 'one-native-select-external' })
  await wait('external selection reaches second tab', (n) => has(n, 'Second tab'))
  tap({ id: 'one-native-select-external' })
  await wait('state survives tab switching', firstState)
  tap({ id: 'one-native-reorder' })
  await wait('state survives keyed reorder', firstState)
  tap({ id: 'one-native-select-external' })
  await wait('reordered second tab mounts', (n) => has(n, 'Second tab'))
  tap({ id: 'one-native-select-external' })
  await wait('state survives reordered switching', firstState)

  tap({ id: 'one-native-toggle-ignore-selection' })
  await wait(
    'selection rejection enabled',
    (n) => has(n, 'Menu action: none') && has(n, 'Reject taps: on') && firstState(n)
  )
  await tapTab(151, 'rejected native')
  await wait(
    'native selection is rejected',
    (n) =>
      has(n, 'Selected: first') &&
      has(n, 'Requested: second') &&
      has(n, 'Reject taps: on') &&
      firstState(n)
  )
  tap({ id: 'one-native-toggle-ignore-selection' })
  await wait(
    'selection acceptance enabled',
    (n) => has(n, 'Reject taps: off') && firstState(n)
  )
  await tapTab(151, 'accepted native')
  await wait(
    'native selection is accepted',
    (n) =>
      has(n, 'Selected: second') &&
      has(n, 'Requested: second') &&
      has(n, 'Reject taps: off') &&
      has(n, 'Second tab')
  )
  tap({ id: 'one-native-select-external' })
  await wait('state survives native selection', firstState)

  tap({ label: 'Open native menu' })
  await wait(
    'menu attributes',
    (n) =>
      has(n, 'Copy') &&
      has(n, 'Disabled') &&
      !has(n, 'Hidden') &&
      n.some((node) => node.AXLabel === 'Disabled' && node.enabled === false)
  )
  tap({ label: 'More' })
  await wait('nested menu opens', (n) => has(n, 'Nested A'))
  tap({ label: 'Nested A' })
  await wait(
    'nested action reaches React',
    (n) => has(n, 'Menu action: nested-a') && has(n, 'Reject taps: off')
  )

  tap({ label: 'Open native menu' })
  await wait('checked toggle menu mounts', (n) => has(n, 'Checked') && has(n, 'Mixed'))
  tap({ label: 'Checked' })
  await wait(
    'checked toggle keeps menu open',
    (n) => has(n, 'Checked') && has(n, 'Mixed')
  )
  screenshot('02-checked-toggle-open.png')
  await dismissMenu()
  await wait(
    'checked value turns off',
    (n) => has(n, 'Checked: off') && has(n, 'Mixed: true,false') && has(n, 'Search: off')
  )
  screenshot('03-resized-trigger.png')
  tap({ label: 'Open native menu' })
  await wait('resized trigger opens menu', (n) => has(n, 'Checked'))
  tap({ label: 'Checked' })
  await wait(
    'second checked update keeps menu open',
    (n) => has(n, 'Checked') && has(n, 'Mixed')
  )
  await dismissMenu()
  await wait(
    'checked value turns on',
    (n) => has(n, 'Checked: on') && has(n, 'Mixed: true,false') && has(n, 'Search: off')
  )

  tap({ label: 'Open native menu' })
  await wait('mixed toggle menu mounts', (n) => has(n, 'Mixed'))
  tap({ label: 'Mixed' })
  await wait('mixed binding updates both values', (n) => has(n, 'Mixed: true,true'))

  tap({ label: 'Open native menu' })
  await wait('palette menu mounts', (n) => has(n, 'Bold') && has(n, 'Italic'))
  tap({ label: 'Bold' })
  await wait('palette action keeps menu open', (n) => has(n, 'Bold') && has(n, 'Italic'))
  screenshot('04-palette-open.png')
  await dismissMenu()
  await wait(
    'palette action reaches React',
    (n) => has(n, 'Menu action: bold') && has(n, 'Reject taps: off')
  )
  tap({ label: 'Open native menu' })
  await wait('kept-open action menu mounts', (n) => has(n, 'Keep Open') && has(n, 'Copy'))
  tap({ label: 'Keep Open' })
  await wait(
    'kept-open action retains menu',
    (n) => has(n, 'Keep Open') && has(n, 'Copy')
  )
  await dismissMenu()
  await wait(
    'kept-open action reaches React',
    (n) => has(n, 'Menu action: keep-open') && has(n, 'Reject taps: off')
  )

  tap({ label: 'Open native menu' })
  await wait('deep menu mounts', (n) => has(n, 'More'))
  tap({ label: 'More' })
  await wait('deep submenu mounts', (n) => has(n, 'Nested B') && has(n, 'Deeper'))
  tap({ label: 'Deeper' })
  await wait('deepest submenu mounts', (n) => has(n, 'Deep 1'))
  tap({ label: 'Deep 1' })
  await wait(
    'deep action reaches React',
    (n) => has(n, 'Menu action: deep-1') && has(n, 'Reject taps: off')
  )

  tap({ id: 'one-native-toggle-search-role' })
  await wait(
    'search role applies without losing state',
    (n) =>
      firstState(n) &&
      has(n, 'Checked: on') &&
      has(n, 'Mixed: true,true') &&
      has(n, 'Search: on')
  )
  screenshot('05-search-role.png')
  await tapTab(325, 'search native')
  await wait(
    'search native tab is accepted',
    (n) =>
      has(n, 'Selected: second') &&
      has(n, 'Requested: second') &&
      has(n, 'Reject taps: off') &&
      has(n, 'Second tab')
  )
  tap({ id: 'one-native-select-external' })
  await wait('state survives search native selection', firstState)
  for (let cycle = 1; cycle <= 2; cycle++) {
    tap({ id: 'BackButton' })
    await wait(`recycle ${cycle}: home mounted`, () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native')
    await wait(
      `recycle ${cycle}: fresh menu props`,
      (n) =>
        has(n, 'Checked: on') &&
        has(n, 'Mixed: true,false') &&
        has(n, 'Menu action: none') &&
        has(n, 'First tab') &&
        Boolean(n.find((node) => node.AXLabel === 'Open native menu')?.frame?.height)
    )
    tap({ label: 'Open native menu' })
    await wait(
      `recycle ${cycle}: identical menu rebuilds`,
      (n) => has(n, 'Copy') && has(n, 'Checked') && has(n, 'Mixed')
    )
    tap({ label: 'Copy' })
    await wait(`recycle ${cycle}: action reaches current emitter`, (n) =>
      has(n, 'Menu action: copy')
    )
  }
  console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
}

if (import.meta.main) {
  const config = parse(process.argv.slice(2))
  const checks: { name: string; durationMs: number }[] = []
  const started = Date.now()
  let failure: string | undefined
  try {
    await run(config, checks)
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error)
    console.error(failure)
  }
  fs.mkdirSync(config.artifactDir, { recursive: true })
  fs.writeFileSync(
    path.join(config.artifactDir, 'outcome.json'),
    JSON.stringify(
      {
        passed: !failure,
        failure,
        checks,
        durationMs: Date.now() - started,
        simulatorId: config.simulatorId,
        bundleId: config.bundleId,
        suite: config.suite,
      },
      null,
      2
    )
  )
  if (failure) process.exit(1)
}
