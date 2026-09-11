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
  type?: string
  enabled?: boolean
  frame?: { x: number; y: number; width: number; height: number }
  [key: string]: unknown
}
type Suite = 'tabs-menu' | 'pickers' | 'forms' | 'sheets'
type Config = {
  simulatorId: string
  bundleId: string
  artifactDir: string
  timeout: number
  suite: Suite
}

function usage() {
  console.log(
    'Usage: bun tests/native-features/scripts/one-native-conformance.ts --simulator-id <UUID> --bundle-id <BUNDLE_ID> [--suite tabs-menu|pickers|forms|sheets] [--artifact-dir <PATH>] [--timeout <MS>]'
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
      if (
        value !== 'tabs-menu' &&
        value !== 'pickers' &&
        value !== 'forms' &&
        value !== 'sheets'
      )
        throw new Error('Suite must be tabs-menu, pickers, forms, or sheets.')
      suite = value
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
const homeLoaded = (nodes: Node[], suite: Suite) =>
  Boolean(
    id(
      nodes,
      suite === 'sheets'
        ? 'nav-one-native-sheet'
        : suite !== 'tabs-menu'
          ? 'nav-one-native-controls'
          : 'nav-one-native'
    )
  )
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
        : config.suite === 'pickers'
          ? pickersLoaded(nodes)
          : config.suite === 'forms'
            ? formsLoaded(nodes)
            : config.suite === 'sheets'
              ? sheetsLoaded(nodes)
              : fixtureLoaded(nodes)
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
    tap({ id: 'nav-one-native-sheet' })
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
    tap({ id: 'nav-one-native-sheet' })
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
    tap({ id: 'nav-one-native-controls' })
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
  if (config.suite === 'pickers') {
    const tapSegment = async (index: number, name: string) => {
      const nodes = await wait(name, (current) =>
        current.some((node) => {
          const frame = node.type === 'TabGroup' ? node.frame : undefined
          return Boolean(
            frame && frame.width > 300 && frame.height >= 25 && frame.height <= 44
          )
        })
      )
      const frame = nodes.find((node) => node.type === 'TabGroup')?.frame
      if (!frame) throw new Error('Expected TabGroup bounds')
      point(
        Math.round(frame.x + (frame.width * (index + 0.5)) / 3),
        Math.round(frame.y + frame.height / 2)
      )
    }
    const wheel = (nodes: Node[], index: number) =>
      nodes.some(
        (node) =>
          node.type === 'Slider' &&
          Number(node.AXValue) === index &&
          node.frame &&
          Math.round(node.frame.height) === 216
      )
    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    tap({ id: 'nav-one-native-controls' })
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
      (nodes) => labels(nodes).includes('Style: wheel · Reject: off') && wheel(nodes, 2)
    )
    screenshot('picker-wheel.png')
    const slider = wheeled.find(
      (node) =>
        node.type === 'Slider' && node.frame && Math.round(node.frame.height) === 216
    )?.frame
    if (!slider) throw new Error('Expected wheel Slider bounds height 216')
    point(
      Math.round(slider.x + slider.width / 2),
      Math.round(slider.y + slider.height / 2 - 32)
    )
    await wait(
      'wheel native selection changes beta',
      (nodes) => value(nodes, 'beta') && request(nodes, 'beta') && wheel(nodes, 1)
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
      (n) => value(n, 'beta') && wheel(n, 1)
    )
    const recycledWheel = recycled.find((n) => n.type === 'Slider')!.frame!
    point(
      recycledWheel.x + recycledWheel.width / 2,
      recycledWheel.y + recycledWheel.height / 2 + 32
    )
    await wait(
      'recycled picker sends current callback',
      (n) => value(n, 'gamma') && request(n, 'gamma') && wheel(n, 2)
    )

    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  await wait('home screen mounted', () => true, true)
  await dismissWarning(true)
  tap({ id: 'nav-one-native' })
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
    tap({ id: 'nav-one-native' })
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
