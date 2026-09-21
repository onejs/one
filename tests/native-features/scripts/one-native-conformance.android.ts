#!/usr/bin/env bun
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

type Bounds = { left: number; top: number; right: number; bottom: number }

type Node = {
  index: number
  parent: number
  attrs: Record<string, string>
  text: string
  contentDescription: string
  className: string
  resourceId: string
  clickable?: boolean
  enabled?: boolean
  checkable?: boolean
  checked?: boolean
  selected?: boolean
  scrollable?: boolean
  bounds?: Bounds
}

type Snapshot = { xml: string; nodes: Node[] }

type Config = {
  deviceId: string
  packageId: string
  artifactDir: string
  timeout: number
  metroPort: number
}

type Selector = {
  id?: string
  role?: string
  clickable?: boolean
  enabled?: boolean
  checked?: boolean
}

type Check = {
  name: string
  result: 'passed'
  durationMs: number
  artifacts: { png: string; xml: string; status: string }
  detail?: Record<string, unknown>
}

const usage = () =>
  console.log(
    'Usage: bun tests/native-features/scripts/one-native-conformance.android.ts --device-id <SERIAL> --package-id <PACKAGE> [--artifact-dir <PATH>] [--timeout <MS>] [--metro-port <PORT>]'
  )

function parse(args: string[]): Config {
  let deviceId = ''
  let packageId = ''
  let artifactDir = '/tmp/one-native-android-proof'
  let timeout = 15_000
  let metroPort = 8081
  if (
    process.env.RCT_METRO_PORT !== undefined &&
    process.env.RCT_METRO_PORT !== ''
  )
    metroPort = Number(process.env.RCT_METRO_PORT)

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    }
    if (arg === '--device-id' || arg === '--serial' || arg === '--adb-device')
      deviceId = args[++index] || ''
    else if (arg === '--package-id' || arg === '--bundle-id')
      packageId = args[++index] || ''
    else if (arg === '--artifact-dir') artifactDir = args[++index] || ''
    else if (arg === '--timeout') timeout = Number(args[++index])
    else if (arg === '--metro-port') metroPort = Number(args[++index])
    else throw new Error(`Unknown argument: ${arg}`)
  }

  if (
    !deviceId ||
    !packageId ||
    !artifactDir ||
    !Number.isInteger(timeout) ||
    timeout <= 0
  ) {
    throw new Error(
      'A device id, package id, artifact directory, and positive integer timeout are required.'
    )
  }
  if (!Number.isInteger(metroPort) || metroPort <= 0 || metroPort > 65535) {
    throw new Error(
      'A valid Metro port is required: --metro-port <PORT> or RCT_METRO_PORT.'
    )
  }
  return { deviceId, packageId, artifactDir, timeout, metroPort }
}

function adbRaw(args: string[]): string {
  return execFileSync('adb', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  })
}

function preflight(config: Config) {
  try {
    adbRaw(['version'])
  } catch {
    throw new Error(
      'Android preflight: adb is not runnable. Install the platform tools and add them to PATH, e.g. export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH".'
    )
  }
  let devices = ''
  try {
    devices = adbRaw(['devices'])
  } catch (error) {
    throw new Error(
      `Android preflight: 'adb devices' failed (${error instanceof Error ? error.message : String(error)}). Start the adb server with 'adb start-server' and retry.`
    )
  }
  const line = devices
    .split(/\r?\n/)
    .find((entry) => entry.split(/\s+/)[0] === config.deviceId)
  if (!line)
    throw new Error(
      `Android preflight: device '${config.deviceId}' is not attached. Boot one, e.g.: emulator -avd sootsim_pixel_8_android_17_api_37_r06 -no-window &   (list AVDs: emulator -list-avds; verify: adb devices)`
    )
  const state = line.split(/\s+/)[1]
  if (state !== 'device')
    throw new Error(
      `Android preflight: device '${config.deviceId}' is '${state}', not ready. Reconnect it (offline), accept the RSA prompt (unauthorized), or cold-boot the emulator, then retry.`
    )
  const wantDevice = 'tcp:8081'
  const wantHost = `tcp:${config.metroPort}`
  let reverses = ''
  try {
    reverses = adbRaw(['-s', config.deviceId, 'reverse', '--list'])
  } catch (error) {
    throw new Error(
      `Android preflight: 'adb reverse --list' failed (${error instanceof Error ? error.message : String(error)}). Reconnect the device and retry.`
    )
  }
  const mapped = reverses
    .split(/\r?\n/)
    .some((entry) => entry.includes(wantDevice) && entry.includes(wantHost))
  if (!mapped)
    throw new Error(
      `Android preflight: no adb reverse mapping device ${wantDevice} to host ${wantHost} (Metro port ${config.metroPort} from --metro-port or RCT_METRO_PORT). Run: adb -s ${config.deviceId} reverse ${wantDevice} ${wantHost}`
    )
}

function commandError(command: string, args: string[], error: unknown) {
  const result = error as {
    stderr?: Buffer | string
    stdout?: Buffer | string
    message?: string
  }
  const detail =
    result.stderr?.toString() ||
    result.stdout?.toString() ||
    result.message ||
    'unknown error'
  return new Error(`${command} ${args.join(' ')} failed: ${detail}`)
}

function adbText(config: Config, args: string[]) {
  try {
    return execFileSync('adb', ['-s', config.deviceId, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30_000,
    })
  } catch (error) {
    throw commandError('adb', ['-s', config.deviceId, ...args], error)
  }
}

function adbBytes(config: Config, args: string[]) {
  try {
    return execFileSync('adb', ['-s', config.deviceId, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30_000,
    })
  } catch (error) {
    throw commandError('adb', ['-s', config.deviceId, ...args], error)
  }
}

function xmlUnescape(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function attributes(source: string) {
  const result: Record<string, string> = {}
  const pattern = /([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*"([^"]*)"/g
  for (const match of source.matchAll(pattern)) result[match[1]] = xmlUnescape(match[2])
  return result
}

function booleanAttribute(attrs: Record<string, string>, name: string) {
  const value = attrs[name]
  return value === undefined ? undefined : value === 'true'
}

function parseBounds(value: string | undefined): Bounds | undefined {
  if (!value) return undefined
  const match = value.match(/^\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]$/)
  if (!match) return undefined
  return {
    left: Number(match[1]),
    top: Number(match[2]),
    right: Number(match[3]),
    bottom: Number(match[4]),
  }
}

function parseXml(xml: string): Node[] {
  const nodes: Node[] = []
  const stack: number[] = []
  const pattern = /<node\b([\s\S]*?)(\/)?>|<\/node>/g
  for (const match of xml.matchAll(pattern)) {
    if (match[0] === '</node>') {
      stack.pop()
      continue
    }
    const attrs = attributes(match[1])
    const index = nodes.length
    nodes.push({
      index,
      parent: stack.length ? stack[stack.length - 1] : -1,
      attrs,
      text: attrs.text || '',
      contentDescription: attrs['content-desc'] || '',
      className: attrs.class || '',
      resourceId: attrs['resource-id'] || '',
      clickable: booleanAttribute(attrs, 'clickable'),
      enabled: booleanAttribute(attrs, 'enabled'),
      checkable: booleanAttribute(attrs, 'checkable'),
      checked: booleanAttribute(attrs, 'checked'),
      selected: booleanAttribute(attrs, 'selected'),
      scrollable: booleanAttribute(attrs, 'scrollable'),
      bounds: parseBounds(attrs.bounds),
    })
    if (!match[2]) stack.push(index)
  }
  return nodes
}

function clickableTarget(nodes: Node[], node: Node): Node | undefined {
  let current: Node | undefined = node
  while (current) {
    if (current.clickable === true) return current
    current = current.parent >= 0 ? nodes[current.parent] : undefined
  }
  return undefined
}

function dumpNodes(config: Config): Snapshot {
  const remote = `/sdcard/one-native-android-proof-${process.pid}.xml`
  adbText(config, ['shell', 'uiautomator', 'dump', remote])
  const xml = adbText(config, ['exec-out', 'cat', remote])
  return { xml, nodes: parseXml(xml) }
}

function snapshot(config: Config): Snapshot {
  const current = dumpNodes(config)
  assertNoRedBox(current.nodes)
  if (!current.nodes.length)
    throw new Error('Android accessibility XML contained no nodes.')
  return current
}

function nodeValues(node: Node) {
  return [
    node.text,
    node.contentDescription,
    node.resourceId,
    node.attrs.role || '',
  ].filter(Boolean)
}

function redBoxMessage(nodes: Node[]) {
  const values = nodes.flatMap(nodeValues)
  const joined = values.join(' ')
  if (
    /\bredbox\b|unable to resolve module|invariant violation|fatal exception|syntaxerror|typeerror/i.test(
      joined
    )
  )
    return joined
  const hasReload = values.some((value) => /\breload\b/i.test(value))
  const hasDismiss = values.some((value) => /\bdismiss\b/i.test(value))
  return hasReload && hasDismiss ? joined : undefined
}

function assertNoRedBox(nodes: Node[]) {
  const message = redBoxMessage(nodes)
  if (message) throw new Error(`The app is showing a RedBox: ${message}`)
}

function resourceIdMatches(resourceId: string, expected: string) {
  return (
    resourceId === expected ||
    resourceId.endsWith(`:id/${expected}`) ||
    resourceId.endsWith(`/id/${expected}`) ||
    resourceId.endsWith(`/${expected}`)
  )
}

function idMatches(node: Node, expected: string) {
  return (
    resourceIdMatches(node.resourceId, expected) ||
    node.attrs.testID === expected ||
    node.attrs['test-id'] === expected ||
    node.contentDescription === expected
  )
}

function roleMatches(node: Node, expected: string) {
  const role = expected.toLowerCase()
  const declared = [node.attrs.role, node.attrs['accessibility-role']]
    .filter(Boolean)
    .map((value) => value.toLowerCase())
  if (declared.includes(role)) return true
  const className = node.className.toLowerCase()
  if (role === 'button')
    return (
      className.includes('button') ||
      (node.clickable === true && node.checkable !== true) ||
      (node.enabled === false &&
        Boolean(node.text || node.contentDescription) &&
        node.checkable !== true)
    )
  if (role === 'switch') return className.includes('switch') || node.checkable === true
  if (role === 'text')
    return className.includes('text') || (Boolean(node.text) && node.clickable === false)
  return className === role || className.endsWith(`.${role}`)
}

function matches(node: Node, selector: Selector) {
  if (
    !selector.id &&
    !selector.role &&
    selector.clickable === undefined &&
    selector.enabled === undefined
  )
    throw new Error(
      'An Android selector must include an id, role, clickable, or enabled condition.'
    )
  return (
    (selector.id === undefined || idMatches(node, selector.id)) &&
    (selector.role === undefined || roleMatches(node, selector.role)) &&
    (selector.clickable === undefined || node.clickable === selector.clickable) &&
    (selector.enabled === undefined || node.enabled === selector.enabled) &&
    (selector.checked === undefined || node.checked === selector.checked)
  )
}

function matching(nodes: Node[], selector: Selector) {
  return nodes.filter((node) => matches(node, selector))
}

function uniqueNode(nodes: Node[], selector: Selector, description: string) {
  const found = matching(nodes, selector)
  if (found.length !== 1)
    throw new Error(
      `${description} resolved ${found.length} nodes; exactly one fresh node is required.`
    )
  return found[0]
}

function validBounds(node: Node, description: string) {
  const bounds = node.bounds
  if (!bounds || bounds.right <= bounds.left || bounds.bottom <= bounds.top)
    throw new Error(`${description} has no usable fresh Android accessibility bounds.`)
  return bounds
}

function visibleIn(bounds: Bounds, viewport: Bounds) {
  return (
    bounds.right > viewport.left &&
    bounds.left < viewport.right &&
    bounds.bottom > viewport.top &&
    bounds.top < viewport.bottom
  )
}

function applicationBounds(nodes: Node[]) {
  return nodes[0]?.bounds || { left: 0, top: 0, right: 10_000, bottom: 10_000 }
}

function textIncludes(nodes: Node[], expected: string) {
  return nodes.some((node) => nodeValues(node).some((value) => value.includes(expected)))
}

function exactlyOneId(nodes: Node[], id: string) {
  return matching(nodes, { id }).length === 1
}

function nodeById(nodes: Node[], id: string) {
  return uniqueNode(nodes, { id }, `Node ${id}`)
}

function orderIds(nodes: Node[]) {
  return ['alpha', 'beta']
    .map((item) => ({ item, node: nodeById(nodes, `one-native-android-order-${item}`) }))
    .sort((left, right) => left.node.index - right.node.index)
    .map(({ item }) => item)
}

let lastFailedConjuncts: string | undefined

function diagnose(
  nodes: Node[],
  parts: Array<[label: string, test: (nodes: Node[]) => boolean]>
): boolean {
  const failed: string[] = []
  for (const [label, test] of parts) {
    let ok = false
    try {
      ok = test(nodes)
    } catch {
      ok = false
    }
    if (!ok) failed.push(label)
  }
  lastFailedConjuncts = failed.length ? failed.join(', ') : undefined
  return failed.length === 0
}

async function waitFor(
  config: Config,
  name: string,
  predicate: (nodes: Node[]) => boolean,
  missingMarker?: string,
  timeoutMs = config.timeout
) {
  const started = Date.now()
  const deadline = started + timeoutMs
  lastFailedConjuncts = undefined
  while (Date.now() < deadline) {
    const current = snapshot(config)
    if (predicate(current.nodes))
      return { snapshot: current, durationMs: Date.now() - started }
    await Bun.sleep(250)
  }
  const marker = missingMarker ? `; missing mount marker ${missingMarker}` : ''
  const diagnosis = lastFailedConjuncts ? `; failed: ${lastFailedConjuncts}` : ''
  throw new Error(`${name} timed out after ${timeoutMs}ms${marker}${diagnosis}`)
}

function tapFresh(
  config: Config,
  name: string,
  selector: Selector,
  check?: (node: Node) => void
) {
  const current = snapshot(config)
  const node = uniqueNode(current.nodes, selector, name)
  check?.(node)
  const bounds = validBounds(node, name)
  const x = Math.round((bounds.left + bounds.right) / 2)
  const y = Math.round((bounds.top + bounds.bottom) / 2)
  adbText(config, ['shell', 'input', 'tap', String(x), String(y)])
}

function tapByText(config: Config, name: string, text: string) {
  const current = snapshot(config)
  const labeled = current.nodes.filter((node) => node.text === text)
  if (labeled.length !== 1)
    throw new Error(
      `${name} resolved ${labeled.length} nodes with text "${text}"; exactly one is required.`
    )
  const target = clickableTarget(current.nodes, labeled[0])
  if (!target)
    throw new Error(`${name} found text "${text}" with no clickable ancestor.`)
  const bounds = validBounds(labeled[0], name)
  const x = Math.round((bounds.left + bounds.right) / 2)
  const y = Math.round((bounds.top + bounds.bottom) / 2)
  adbText(config, ['shell', 'input', 'tap', String(x), String(y)])
}

function swipeOnNode(
  config: Config,
  name: string,
  selector: Selector,
  fromX: number,
  toX: number,
  durationMs = 300
) {
  const current = snapshot(config)
  const node = uniqueNode(current.nodes, selector, name)
  const bounds = validBounds(node, name)
  const width = bounds.right - bounds.left
  const x1 = Math.round(bounds.left + width * fromX)
  const x2 = Math.round(bounds.left + width * toX)
  const y = Math.round((bounds.top + bounds.bottom) / 2)
  adbText(config, [
    'shell',
    'input',
    'swipe',
    String(x1),
    String(y),
    String(x2),
    String(y),
    String(durationMs),
  ])
}

function adbType(config: Config, text: string) {
  if (!/^[a-z0-9]+$/i.test(text))
    throw new Error(`adbType only supports ASCII letters and digits, got "${text}".`)
  adbText(config, ['shell', 'input', 'text', text])
}

function pressBack(config: Config) {
  adbText(config, ['shell', 'input', 'keyevent', '4'])
}

function swipeFresh(config: Config, name: string) {
  const current = snapshot(config)
  const scrollables = current.nodes.filter((node) => node.scrollable === true)
  if (scrollables.length !== 1)
    throw new Error(
      `${name} resolved ${scrollables.length} scrollable nodes; exactly one is required.`
    )
  const bounds = validBounds(scrollables[0], name)
  const x = Math.round((bounds.left + bounds.right) / 2)
  const height = bounds.bottom - bounds.top
  const y1 = Math.round(bounds.top + height * 0.72)
  const y2 = Math.round(bounds.top + height * 0.3)
  adbText(config, [
    'shell',
    'input',
    'swipe',
    String(x),
    String(y1),
    String(x),
    String(y2),
    '250',
  ])
}

async function tapNavigation(config: Config, navId = 'nav-one-native-android') {
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = snapshot(config)
    const rows = matching(current.nodes, {
      id: navId,
      role: 'button',
      clickable: true,
    })
    const rowBounds = rows.length === 1 ? rows[0].bounds : undefined
    if (
      rowBounds &&
      rowBounds.right > rowBounds.left &&
      rowBounds.bottom > rowBounds.top &&
      visibleIn(rowBounds, applicationBounds(current.nodes))
    ) {
      const candidateBounds = rowBounds
      await waitFor(config, 'Android navigation row settles', (nodes) => {
        const settled = matching(nodes, {
          id: navId,
          role: 'button',
          clickable: true,
        })
        if (settled.length !== 1 || !settled[0].bounds) return false
        return (
          settled[0].bounds.left === candidateBounds.left &&
          settled[0].bounds.top === candidateBounds.top &&
          settled[0].bounds.right === candidateBounds.right &&
          settled[0].bounds.bottom === candidateBounds.bottom
        )
      })
      tapFresh(config, 'Android proof navigation row', {
        id: navId,
        role: 'button',
        clickable: true,
      })
      return
    }
    const previousPositions = current.nodes
      .filter((node) => node.resourceId.includes('nav-') && node.bounds)
      .map((node) => `${node.resourceId}:${node.bounds!.top}:${node.bounds!.bottom}`)
      .join('|')
    swipeFresh(config, 'Home navigation scroll view')
    // a reload can absorb the first swipe while the list is still settling, so a swipe that
    // moves nothing retries instead of blocking for the full timeout.
    const advanced = await waitFor(
      config,
      'Home navigation scroll position advances',
      (nodes) => {
        const nextPositions = nodes
          .filter((node) => node.resourceId.includes('nav-') && node.bounds)
          .map((node) => `${node.resourceId}:${node.bounds!.top}:${node.bounds!.bottom}`)
          .join('|')
        return nextPositions !== previousPositions
      },
      undefined,
      5_000
    ).then(
      () => true,
      () => false
    )
    if (!advanced) continue
  }
  throw new Error(`Could not bring ${navId} into view on the home list.`)
}

function shortNode(node: Node | undefined) {
  if (!node) return undefined
  return {
    text: node.text,
    contentDescription: node.contentDescription,
    resourceId: node.resourceId,
    className: node.className,
    clickable: node.clickable,
    enabled: node.enabled,
    checkable: node.checkable,
    checked: node.checked,
    bounds: node.bounds,
  }
}

function runDetail(nodes: Node[], ids: string[]) {
  return Object.fromEntries(ids.map((id) => [id, shortNode(matching(nodes, { id })[0])]))
}

const proofIds = [
  'one-native-android-mounted',
  'one-native-android-prop-status',
  'one-native-android-bounds-box',
  'one-native-android-prop-value',
  'one-native-android-prop-mutate',
  'one-native-android-button-status',
  'one-native-android-real-button',
  'one-native-android-reorder',
  'one-native-android-icon-row',
  'one-native-android-icon',
  'one-native-android-icon-filled',
  'one-native-android-icon-button',
  'one-native-android-switch-status',
  'one-native-android-switch-policy-status',
  'one-native-android-switch',
  'one-native-android-switch-policy',
  'one-native-android-switch-reset',
  'one-native-android-lifecycle-status',
  'one-native-android-toggle-optional',
  'one-native-android-optional',
  'one-native-android-optional-text',
  'one-native-android-disabled-status',
  'one-native-android-disabled-button',
  'one-native-android-disabled-switch',
  'one-native-android-order-status',
  'one-native-android-order-row',
  'one-native-android-order-alpha',
  'one-native-android-order-beta',
  'one-native-android-decoy',
  'one-native-android-decoy-label',
]

function duplicateIds(nodes: Node[]) {
  return duplicateIdsIn(nodes, proofIds)
}

// Material Symbols star (f09a) is what the app map resolves `name="star"` to.
const MaterialSymbolsStar = String.fromCharCode(0xf09a)

function duplicateIdsIn(nodes: Node[], ids: string[]) {
  return ids.filter((id) => matching(nodes, { id }).length !== 1)
}

function hasDuplicates(nodes: Node[], ids: string[]) {
  return ids.filter((id) => matching(nodes, { id }).length > 1)
}

// In landscape the short window edge (~340dp usable) clips everything below the
// switch policy status. Assert that observable prefix there.
const inputsIds = [
  'one-native-android-inputs-screen',
  'one-native-android-inputs-mounted',
  'one-native-android-inputs-text-status',
  'one-native-android-inputs-textfield',
  'one-native-android-inputs-text-row',
  'one-native-android-inputs-text-policy',
  'one-native-android-inputs-text-reset',
  'one-native-android-inputs-slider-status',
  'one-native-android-inputs-slider',
  'one-native-android-inputs-slider-row',
  'one-native-android-inputs-slider-down',
  'one-native-android-inputs-slider-up',
  'one-native-android-inputs-dialog-status',
  'one-native-android-inputs-dialog-show',
  'one-native-android-inputs-custom-status',
  'one-native-android-inputs-custom-show',
  'one-native-android-inputs-progress-status',
  'one-native-android-inputs-progress-linear',
  'one-native-android-inputs-progress-circular',
]

const proofIdsVisibleLandscape = [
  'one-native-android-mounted',
  'one-native-android-prop-status',
  'one-native-android-bounds-box',
  'one-native-android-prop-value',
  'one-native-android-prop-mutate',
  'one-native-android-button-status',
  'one-native-android-real-button',
  'one-native-android-reorder',
  'one-native-android-icon-row',
  'one-native-android-icon',
  'one-native-android-icon-filled',
  'one-native-android-icon-button',
  'one-native-android-switch-status',
  'one-native-android-switch-policy-status',
]

function nodeWidth(node: Node) {
  if (!node.bounds) return 0
  return node.bounds.right - node.bounds.left
}

function lockRotation(config: Config, rotation: string) {
  adbText(config, ['shell', 'wm', 'user-rotation', 'lock', rotation])
}

function freeRotation(config: Config) {
  adbText(config, ['shell', 'wm', 'user-rotation', 'free'])
}

function relaunchApp(config: Config) {
  adbText(config, ['shell', 'am', 'force-stop', config.packageId])
  const launcherComponent = adbText(config, [
    'shell',
    'cmd',
    'package',
    'resolve-activity',
    '--brief',
    '-c',
    'android.intent.category.LAUNCHER',
    config.packageId,
  ])
    .trim()
    .split(/\r?\n/)
    .findLast((line) => line.includes('/'))
  if (!launcherComponent)
    throw new Error(`No launcher activity resolved for ${config.packageId}.`)
  adbText(config, [
    'shell',
    'am',
    'start',
    '-W',
    '-n',
    launcherComponent,
  ])
}

async function run(config: Config) {
  mkdirSync(config.artifactDir, { recursive: true })
  const checks: Check[] = []
  let captureNumber = 0

  const capture = (
    name: string,
    current: Snapshot,
    result: 'passed' | 'failed',
    error?: string,
    detail?: Record<string, unknown>
  ) => {
    const stem = `${String(++captureNumber).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
    const png = path.join(config.artifactDir, `${stem}.png`)
    const xml = path.join(config.artifactDir, `${stem}.xml`)
    const status = path.join(config.artifactDir, `${stem}.status.json`)
    const image = adbBytes(config, ['exec-out', 'screencap', '-p'])
    if (image.length < 8 || image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
      throw new Error(`${name} screenshot was not a PNG.`)
    writeFileSync(xml, current.xml)
    writeFileSync(png, image)
    writeFileSync(
      status,
      JSON.stringify(
        {
          suite: 'one-native-android',
          name,
          result,
          error,
          deviceId: config.deviceId,
          packageId: config.packageId,
          nodes: current.nodes.length,
          detail,
          capturedAt: new Date().toISOString(),
          artifacts: { png, xml, status },
        },
        null,
        2
      )
    )
    return { png, xml, status }
  }

  const expect = async (
    name: string,
    predicate: (nodes: Node[]) => boolean,
    missingMarker?: string,
    detail?: (nodes: Node[]) => Record<string, unknown>
  ) => {
    const result = await waitFor(config, name, predicate, missingMarker)
    const observed = detail?.(result.snapshot.nodes)
    const artifacts = capture(name, result.snapshot, 'passed', undefined, observed)
    const check: Check = {
      name,
      result: 'passed',
      durationMs: result.durationMs,
      artifacts,
      detail: observed,
    }
    checks.push(check)
    console.log(`PASS ${name}`)
    return result.snapshot
  }

  try {
    preflight(config)
    relaunchApp(config)

    await expect(
      'app-mounted',
      (nodes) =>
        exactlyOneId(nodes, 'home-screen') &&
        textIncludes(nodes, '@vxrn/native Test Suite'),
      'home-screen'
    )
    await tapNavigation(config)
    await expect(
      'android-proof-mounted',
      (nodes) =>
        exactlyOneId(nodes, 'one-native-android-mounted') &&
        textIncludes(nodes, 'Android proof mounted'),
      'one-native-android-mounted'
    )

    const initial = await expect(
      'initial-accessibility-and-order',
      (nodes) => {
        const mounted = matching(nodes, { id: 'one-native-android-mounted' })
        const realButton = matching(nodes, {
          id: 'one-native-android-real-button',
          role: 'button',
          clickable: true,
          enabled: true,
        })
        const controlledSwitch = matching(nodes, {
          id: 'one-native-android-switch',
          role: 'switch',
          clickable: true,
          enabled: true,
          checked: false,
        })
        const disabledButton = matching(nodes, {
          id: 'one-native-android-disabled-button',
        })
        const disabledSwitch = matching(nodes, {
          id: 'one-native-android-disabled-switch',
        })
        const decoy = matching(nodes, {
          id: 'one-native-android-decoy',
          clickable: false,
        })
        return (
          mounted.length === 1 &&
          realButton.length === 1 &&
          roleMatches(realButton[0], 'button') &&
          controlledSwitch.length === 1 &&
          roleMatches(controlledSwitch[0], 'switch') &&
          controlledSwitch[0].checkable === true &&
          disabledButton.length === 1 &&
          disabledButton[0].enabled === false &&
          roleMatches(disabledButton[0], 'button') &&
          disabledSwitch.length === 1 &&
          disabledSwitch[0].enabled === false &&
          disabledSwitch[0].checked === false &&
          roleMatches(disabledSwitch[0], 'switch') &&
          decoy.length === 1 &&
          orderIds(nodes).join(',') === 'alpha,beta'
        )
      },
      'one-native-android-mounted',
      (nodes) => ({
        controls: runDetail(nodes, [
          'one-native-android-real-button',
          'one-native-android-switch',
          'one-native-android-disabled-button',
          'one-native-android-disabled-switch',
          'one-native-android-decoy',
        ]),
        order: orderIds(nodes),
      })
    )
    const initialBox = validBounds(
      nodeById(initial.nodes, 'one-native-android-bounds-box'),
      'Initial bounds box'
    )

    tapFresh(config, 'Prop mutation button', {
      id: 'one-native-android-prop-mutate',
      role: 'button',
      clickable: true,
    })
    await expect(
      'prop-mutation-and-fresh-bounds',
      (nodes) => {
        const box = nodeById(nodes, 'one-native-android-bounds-box')
        return (
          textIncludes(nodes, 'Prop: expanded') &&
          textIncludes(nodes, 'Expanded Android Compose text prop') &&
          Boolean(box.bounds) &&
          box.bounds!.right - box.bounds!.left > initialBox.right - initialBox.left
        )
      },
      'one-native-android-mounted',
      (nodes) => ({
        boundsBox: shortNode(nodeById(nodes, 'one-native-android-bounds-box')),
        prop: shortNode(nodeById(nodes, 'one-native-android-prop-value')),
      })
    )

    tapFresh(config, 'Real button first tap', {
      id: 'one-native-android-real-button',
      role: 'button',
      clickable: true,
    })
    await expect(
      'real-button-tap-1',
      (nodes) => textIncludes(nodes, 'Button taps: 1'),
      'one-native-android-mounted'
    )
    tapFresh(config, 'Real button second tap', {
      id: 'one-native-android-real-button',
      role: 'button',
      clickable: true,
    })
    await expect(
      'real-button-tap-2',
      (nodes) => textIncludes(nodes, 'Button taps: 2'),
      'one-native-android-mounted'
    )

    tapFresh(config, 'Controlled switch rejection tap', {
      id: 'one-native-android-switch',
      role: 'switch',
      clickable: true,
    })
    await expect(
      'controlled-switch-rejection',
      (nodes) => {
        const control = matching(nodes, {
          id: 'one-native-android-switch',
          role: 'switch',
          checked: false,
        })
        return (
          control.length === 1 &&
          textIncludes(nodes, 'Switch: off · Request: on · Revision: 0')
        )
      },
      'one-native-android-mounted'
    )

    tapFresh(config, 'Switch acceptance policy button', {
      id: 'one-native-android-switch-policy',
      role: 'button',
      clickable: true,
    })
    await expect(
      'controlled-switch-acceptance-enabled',
      (nodes) => {
        const policy = matching(nodes, {
          id: 'one-native-android-switch-policy',
          role: 'button',
          clickable: true,
        })
        const status = matching(nodes, { id: 'one-native-android-switch-policy-status' })
        return policy.length === 1 && status.length === 1 && status[0].text === 'Policy: accept'
      },
      'one-native-android-mounted'
    )
    tapFresh(config, 'Controlled switch acceptance tap', {
      id: 'one-native-android-switch',
      role: 'switch',
      clickable: true,
    })
    await expect(
      'controlled-switch-acceptance',
      (nodes) => {
        const control = matching(nodes, {
          id: 'one-native-android-switch',
          role: 'switch',
          checked: true,
        })
        return (
          control.length === 1 &&
          textIncludes(nodes, 'Switch: on · Request: on · Revision: 0')
        )
      },
      'one-native-android-mounted'
    )

    tapFresh(config, 'Switch revision reset button', {
      id: 'one-native-android-switch-reset',
      role: 'button',
      clickable: true,
    })
    await expect(
      'controlled-switch-revision-reset',
      (nodes) => {
        const control = matching(nodes, {
          id: 'one-native-android-switch',
          role: 'switch',
          checked: false,
        })
        return (
          control.length === 1 &&
          textIncludes(nodes, 'Switch: off · Request: off · Revision: 1')
        )
      },
      'one-native-android-mounted'
    )

    tapFresh(config, 'Keyed reorder button', {
      id: 'one-native-android-reorder',
      role: 'button',
      clickable: true,
    })
    await expect(
      'keyed-reorder',
      (nodes) => orderIds(nodes).join(',') === 'beta,alpha',
      'one-native-android-mounted',
      (nodes) => ({ order: orderIds(nodes) })
    )

    tapFresh(config, 'Optional unmount button', {
      id: 'one-native-android-toggle-optional',
      role: 'button',
      clickable: true,
    })
    await expect(
      'unmount-optional-child',
      (nodes) =>
        !matching(nodes, { id: 'one-native-android-optional' }).length &&
        textIncludes(nodes, 'Optional: unmounted'),
      'one-native-android-mounted'
    )
    tapFresh(config, 'Optional remount button', {
      id: 'one-native-android-toggle-optional',
      role: 'button',
      clickable: true,
    })
    await expect(
      'remount-optional-child',
      (nodes) =>
        exactlyOneId(nodes, 'one-native-android-optional') &&
        textIncludes(nodes, 'Optional: mounted'),
      'one-native-android-mounted'
    )

    tapFresh(
      config,
      'Disabled button coordinate tap',
      { id: 'one-native-android-disabled-button', role: 'button' },
      (node) => {
        if (node.enabled !== false)
          throw new Error('Disabled button did not publish enabled=false.')
      }
    )
    tapFresh(
      config,
      'Disabled switch coordinate tap',
      { id: 'one-native-android-disabled-switch', role: 'switch' },
      (node) => {
        if (node.enabled !== false || node.checked !== false)
          throw new Error(
            'Disabled switch did not publish enabled=false and checked=false.'
          )
      }
    )
    await expect(
      'disabled-controls-reject-taps',
      (nodes) =>
        textIncludes(nodes, 'Disabled button taps: 0 · Disabled switch taps: 0') &&
        matching(nodes, { id: 'one-native-android-disabled-button', enabled: false })
          .length === 1 &&
        matching(nodes, {
          id: 'one-native-android-disabled-switch',
          enabled: false,
          checked: false,
        }).length === 1,
      'one-native-android-mounted'
    )

    tapFresh(config, 'Decoy negative coordinate tap', {
      id: 'one-native-android-decoy',
      clickable: false,
    })
    await expect(
      'decoy-negative-control',
      (nodes) =>
        textIncludes(nodes, 'Button taps: 2') &&
        matching(nodes, { id: 'one-native-android-decoy', clickable: false }).length ===
          1 &&
        textIncludes(nodes, 'Tap real button'),
      'one-native-android-mounted'
    )

    await expect(
      'material-symbols-icons',
      (nodes) => {
        const outlined = nodeById(nodes, 'one-native-android-icon')
        const filled = nodeById(nodes, 'one-native-android-icon-filled')
        return (
          outlined.text === MaterialSymbolsStar &&
          filled.text === MaterialSymbolsStar &&
          outlined.contentDescription === 'Star outline' &&
          filled.contentDescription === 'Star filled' &&
          nodeWidth(outlined) > 0 &&
          nodeWidth(filled) > 0
        )
      },
      'one-native-android-mounted',
      (nodes) =>
        runDetail(nodes, ['one-native-android-icon', 'one-native-android-icon-filled'])
    )
    const iconButtonSnapshot = snapshot(config)
    const iconButton = nodeById(iconButtonSnapshot.nodes, 'one-native-android-icon-button')
    const iconButtonBounds = validBounds(iconButton, 'Icon button')
    const addGlyph = String.fromCodePoint(0xe145)
    const glyphNodes = iconButtonSnapshot.nodes.filter(
      (node) =>
        node.text.includes(addGlyph) &&
        node.bounds &&
        node.bounds.left >= iconButtonBounds.left &&
        node.bounds.right <= iconButtonBounds.right &&
        node.bounds.top >= iconButtonBounds.top &&
        node.bounds.bottom <= iconButtonBounds.bottom
    )
    if (glyphNodes.length !== 1)
      throw new Error(
        `Icon button published ${glyphNodes.length} add glyph nodes inside its bounds; exactly one is required.`
      )
    tapFresh(config, 'Icon button tap', {
      id: 'one-native-android-icon-button',
      role: 'button',
      clickable: true,
    })
    await expect(
      'material-symbols-icon-button-tap',
      (nodes) => textIncludes(nodes, 'Icon tapped'),
      'one-native-android-mounted',
      (nodes) => runDetail(nodes, ['one-native-android-icon-button'])
    )

    for (let cycle = 0; cycle < 6; cycle++)
      tapFresh(config, `Rapid recycle toggle ${cycle + 1}`, {
        id: 'one-native-android-toggle-optional',
        role: 'button',
        clickable: true,
      })
    for (let cycle = 0; cycle < 4; cycle++)
      tapFresh(config, `Rapid recycle reorder ${cycle + 1}`, {
        id: 'one-native-android-reorder',
        role: 'button',
        clickable: true,
      })
    await expect(
      'rapid-recycle-stress',
      (nodes) =>
        textIncludes(nodes, 'Optional: mounted') &&
        exactlyOneId(nodes, 'one-native-android-optional') &&
        orderIds(nodes).join(',') === 'beta,alpha' &&
        duplicateIds(nodes).length === 0,
      'one-native-android-mounted',
      (nodes) => ({
        order: orderIds(nodes),
        duplicates: duplicateIds(nodes),
        optional: shortNode(nodeById(nodes, 'one-native-android-optional')),
      })
    )

    tapFresh(config, 'Post-stress real button tap', {
      id: 'one-native-android-real-button',
      role: 'button',
      clickable: true,
    })
    await expect(
      'post-stress-single-handler',
      (nodes) =>
        textIncludes(nodes, 'Button taps: 3') &&
        textIncludes(nodes, 'Disabled button taps: 0 · Disabled switch taps: 0') &&
        duplicateIds(nodes).length === 0,
      'one-native-android-mounted',
      (nodes) => ({ duplicates: duplicateIds(nodes) })
    )

    tapFresh(config, 'Post-stress switch tap', {
      id: 'one-native-android-switch',
      role: 'switch',
      clickable: true,
    })
    await expect(
      'post-stress-switch-accept',
      (nodes) => {
        const control = matching(nodes, {
          id: 'one-native-android-switch',
          role: 'switch',
          checked: true,
        })
        return (
          control.length === 1 &&
          textIncludes(nodes, 'Switch: on · Request: on · Revision: 1') &&
          duplicateIds(nodes).length === 0
        )
      },
      'one-native-android-mounted',
      (nodes) => ({ duplicates: duplicateIds(nodes) })
    )

    const portraitRowWidth = nodeWidth(
      nodeById(snapshot(config).nodes, 'one-native-android-button-row')
    )
    if (portraitRowWidth <= 0)
      throw new Error('Pre-rotation button row has no usable width.')
    try {
      lockRotation(config, '1')
      await expect(
        'orientation-landscape-relayout',
        (nodes) => {
          const row = nodeById(nodes, 'one-native-android-button-row')
          const width = nodeWidth(row)
          const window = applicationBounds(nodes)
          return diagnose(nodes, [
            ['mounted marker', (n) => exactlyOneId(n, 'one-native-android-mounted')],
            ['button taps kept', (n) => textIncludes(n, 'Button taps: 3')],
            ['switch kept', (n) => textIncludes(n, 'Switch: on · Request: on · Revision: 1')],
            ['prop kept', (n) => textIncludes(n, 'Prop: expanded')],
            ['window is landscape', () => window.right - window.left > window.bottom - window.top],
            ['row widened', () => width > portraitRowWidth * 1.2],
            [
              'no landscape duplicates',
              (n) => duplicateIdsIn(n, proofIdsVisibleLandscape).length === 0,
            ],
          ])
        },
        'one-native-android-mounted',
        (nodes) => ({
          portraitRowWidth,
          landscapeRowWidth: nodeWidth(
            nodeById(nodes, 'one-native-android-button-row')
          ),
          window: applicationBounds(nodes),
          duplicates: duplicateIdsIn(nodes, proofIdsVisibleLandscape),
        })
      )
      tapFresh(config, 'Landscape real button tap', {
        id: 'one-native-android-real-button',
        role: 'button',
        clickable: true,
      })
      await expect(
        'orientation-landscape-live-interaction',
        (nodes) =>
          diagnose(nodes, [
            ['button tap landed', (n) => textIncludes(n, 'Button taps: 4')],
            [
              'no landscape duplicates',
              (n) => duplicateIdsIn(n, proofIdsVisibleLandscape).length === 0,
            ],
          ]),
        'one-native-android-mounted',
        (nodes) => ({ duplicates: duplicateIdsIn(nodes, proofIdsVisibleLandscape) })
      )
    } finally {
      freeRotation(config)
    }
    await expect(
      'orientation-portrait-revert',
      (nodes) => {
        const row = nodeById(nodes, 'one-native-android-button-row')
        const width = nodeWidth(row)
        const ratio = width / portraitRowWidth
        return diagnose(nodes, [
          ['mounted marker', (n) => exactlyOneId(n, 'one-native-android-mounted')],
          ['button taps kept', (n) => textIncludes(n, 'Button taps: 4')],
          ['switch kept', (n) => textIncludes(n, 'Switch: on · Request: on · Revision: 1')],
          ['optional kept', (n) => textIncludes(n, 'Optional: mounted')],
          ['prop kept', (n) => textIncludes(n, 'Prop: expanded')],
          ['row width reverted', () => ratio > 0.9 && ratio < 1.1],
          ['no duplicates', (n) => duplicateIds(n).length === 0],
        ])
      },
      'one-native-android-mounted',
      (nodes) => ({
        portraitRowWidth,
        revertedRowWidth: nodeWidth(
          nodeById(nodes, 'one-native-android-button-row')
        ),
        duplicates: duplicateIds(nodes),
      })
    )

    pressBack(config)
    await expect(
      'inputs-navigate-home',
      (nodes) =>
        diagnose(nodes, [
          ['home-screen marker', (n) => exactlyOneId(n, 'home-screen')],
          ['nav list row', (n) => n.some((node) => node.resourceId.includes('nav-'))],
        ]),
      'home-screen'
    )
    await tapNavigation(config, 'nav-one-native-android-inputs')
    await expect(
      'inputs-proof-mounted',
      (nodes) =>
        diagnose(nodes, [
          ['inputs marker', (n) => exactlyOneId(n, 'one-native-android-inputs-mounted')],
          ['mounted text', (n) => textIncludes(n, 'Android inputs proof mounted')],
        ]),
      'one-native-android-inputs-mounted'
    )

    tapFresh(config, 'Inputs textfield focus', {
      id: 'one-native-android-inputs-textfield',
    })
    adbType(config, 'h')
    await expect(
      'inputs-textfield-reject',
      (nodes) =>
        diagnose(nodes, [
          ['request observed', (n) => textIncludes(n, 'Request: h · Revision: 0')],
          ['value rejected', (n) => !textIncludes(n, 'Text: h')],
        ]),
      'one-native-android-inputs-mounted'
    )

    tapFresh(config, 'Inputs text acceptance policy button', {
      id: 'one-native-android-inputs-text-policy',
      role: 'button',
      clickable: true,
    })
    tapFresh(config, 'Inputs textfield refocus', {
      id: 'one-native-android-inputs-textfield',
    })
    adbType(config, 'hi')
    await expect(
      'inputs-textfield-accept',
      (nodes) => textIncludes(nodes, 'Text: hi · Request: hi · Revision: 0'),
      'one-native-android-inputs-mounted'
    )

    tapFresh(config, 'Inputs text revision reset button', {
      id: 'one-native-android-inputs-text-reset',
      role: 'button',
      clickable: true,
    })
    await expect(
      'inputs-textfield-revision-reset',
      (nodes) => textIncludes(nodes, 'Text:  · Request:  · Revision: 1'),
      'one-native-android-inputs-mounted'
    )

    pressBack(config)
    if (
      !exactlyOneId(
        snapshot(config).nodes,
        'one-native-android-inputs-mounted'
      )
    ) {
      await expect(
        'inputs-renavigate-home',
        (nodes) =>
          diagnose(nodes, [
            ['home-screen marker', (n) => exactlyOneId(n, 'home-screen')],
            ['nav list row', (n) => n.some((node) => node.resourceId.includes('nav-'))],
          ]),
        'home-screen'
      )
      await tapNavigation(config, 'nav-one-native-android-inputs')
      await expect(
        'inputs-proof-remounted',
        (nodes) =>
          diagnose(nodes, [
            ['inputs marker', (n) => exactlyOneId(n, 'one-native-android-inputs-mounted')],
            ['mounted text', (n) => textIncludes(n, 'Android inputs proof mounted')],
          ]),
        'one-native-android-inputs-mounted'
      )
    }

    tapFresh(config, 'Inputs slider step up button', {
      id: 'one-native-android-inputs-slider-up',
      role: 'button',
      clickable: true,
    })
    await expect(
      'inputs-slider-js-step',
      (nodes) => textIncludes(nodes, 'Slider: 30 · Request: 25'),
      'one-native-android-inputs-mounted'
    )

    swipeOnNode(
      config,
      'Inputs slider drag',
      {
        id: 'one-native-android-inputs-slider',
      },
      0.3,
      0.85
    )
    await expect(
      'inputs-slider-drag',
      (nodes) => {
        const status =
          matching(nodes, { id: 'one-native-android-inputs-slider-status' })[0]
            ?.text ?? ''
        const match = /Slider: (-?\d+) · Request: (-?\d+)/.exec(status)
        const value = match ? Number(match[1]) : null
        const request = match ? Number(match[2]) : null
        return diagnose(nodes, [
          ['slider status parses', () => match !== null],
          ['value equals request', () => value !== null && value === request],
          ['value moved', () => value !== null && value !== 30],
          ['value snapped to step', () => value !== null && value % 5 === 0],
        ])
      },
      'one-native-android-inputs-mounted',
      (nodes) => ({
        slider: shortNode(
          matching(nodes, { id: 'one-native-android-inputs-slider-status' })[0]
        ),
      })
    )

    tapFresh(config, 'Inputs show dialog button', {
      id: 'one-native-android-inputs-dialog-show',
      role: 'button',
      clickable: true,
    })
    await expect(
      'inputs-dialog-shown',
      (nodes) =>
        diagnose(nodes, [
          ['dialog title', (n) => textIncludes(n, 'Delete item?')],
          ['dialog message', (n) => textIncludes(n, 'This cannot be undone.')],
          ['confirm button', (n) => textIncludes(n, 'Delete')],
          ['dismiss button', (n) => textIncludes(n, 'Cancel')],
        ]),
      'one-native-android-inputs-mounted'
    )
    tapByText(config, 'Inputs dialog confirm button', 'Delete')
    await expect(
      'inputs-dialog-confirm',
      (nodes) =>
        diagnose(nodes, [
          ['confirm recorded', (n) => textIncludes(n, 'Dialog: confirmed')],
          ['dialog gone', (n) => !textIncludes(n, 'Delete item?')],
        ]),
      'one-native-android-inputs-mounted'
    )

    tapFresh(config, 'Inputs show dialog again button', {
      id: 'one-native-android-inputs-dialog-show',
      role: 'button',
      clickable: true,
    })
    await expect(
      'inputs-dialog-reshown',
      (nodes) => textIncludes(nodes, 'Delete item?'),
      'one-native-android-inputs-mounted'
    )
    tapByText(config, 'Inputs dialog dismiss button', 'Cancel')
    await expect(
      'inputs-dialog-dismiss-button',
      (nodes) =>
        diagnose(nodes, [
          ['dismiss recorded', (n) => textIncludes(n, 'Dialog: dismissed')],
          ['dialog gone', (n) => !textIncludes(n, 'Delete item?')],
        ]),
      'one-native-android-inputs-mounted'
    )

    tapFresh(config, 'Inputs show dialog third button', {
      id: 'one-native-android-inputs-dialog-show',
      role: 'button',
      clickable: true,
    })
    await expect(
      'inputs-dialog-reshown-again',
      (nodes) => textIncludes(nodes, 'Delete item?'),
      'one-native-android-inputs-mounted'
    )
    pressBack(config)
    await expect(
      'inputs-dialog-back-dismiss',
      (nodes) =>
        diagnose(nodes, [
          ['dismiss recorded', (n) => textIncludes(n, 'Dialog: dismissed')],
          ['dialog gone', (n) => !textIncludes(n, 'Delete item?')],
          ['screen kept', (n) => exactlyOneId(n, 'one-native-android-inputs-mounted')],
        ]),
      'one-native-android-inputs-mounted'
    )

    tapFresh(config, 'Inputs show custom dialog button', {
      id: 'one-native-android-inputs-custom-show',
      role: 'button',
      clickable: true,
    })
    await expect(
      'inputs-custom-dialog-shown',
      (nodes) =>
        diagnose(nodes, [
          ['custom body id', (n) => exactlyOneId(n, 'one-native-android-inputs-custom-body')],
          ['custom body text', (n) => textIncludes(n, 'Custom dialog body')],
        ]),
      'one-native-android-inputs-mounted'
    )
    tapFresh(config, 'Inputs custom dialog close button', {
      id: 'one-native-android-inputs-custom-close',
      role: 'button',
      clickable: true,
    })
    await expect(
      'inputs-custom-dialog-closed',
      (nodes) =>
        diagnose(nodes, [
          ['close recorded', (n) => textIncludes(n, 'Custom dialog: closed')],
          ['custom body gone', (n) => !textIncludes(n, 'Custom dialog body')],
        ]),
      'one-native-android-inputs-mounted'
    )

    tapFresh(config, 'Inputs show custom dialog again button', {
      id: 'one-native-android-inputs-custom-show',
      role: 'button',
      clickable: true,
    })
    await expect(
      'inputs-custom-dialog-reshown',
      (nodes) => textIncludes(nodes, 'Custom dialog body'),
      'one-native-android-inputs-mounted'
    )
    pressBack(config)
    await expect(
      'inputs-custom-dialog-back-dismiss',
      (nodes) =>
        diagnose(nodes, [
          ['dismiss recorded', (n) => textIncludes(n, 'Custom dialog: dismissed')],
          ['custom body gone', (n) => !textIncludes(n, 'Custom dialog body')],
          ['screen kept', (n) => exactlyOneId(n, 'one-native-android-inputs-mounted')],
        ]),
      'one-native-android-inputs-mounted'
    )

    await expect(
      'inputs-progress-and-duplicate-sweep',
      (nodes) =>
        diagnose(nodes, [
          ['linear indicator', (n) => exactlyOneId(n, 'one-native-android-inputs-progress-linear')],
          ['circular indicator', (n) => exactlyOneId(n, 'one-native-android-inputs-progress-circular')],
          ['progress text', (n) => textIncludes(n, 'Progress mounted')],
          ['screen root', (n) => exactlyOneId(n, 'one-native-android-inputs-screen')],
          ['no duplicates', (n) => hasDuplicates(n, inputsIds).length === 0],
        ]),
      'one-native-android-inputs-mounted',
      (nodes) => ({ duplicates: hasDuplicates(nodes, inputsIds) })
    )

    // first-party safe-area on Android: the same fixture as iOS, asserting
    // live overlap-relative insets, a nested provider, and keyboard
    // exclusion. the nested box sits below the status bar, so its top is 0
    // while the outer top stays positive, which proves per-view overlap
    // rather than forwarded window insets.
    pressBack(config)
    await expect(
      'safe-area-home',
      (nodes) =>
        diagnose(nodes, [
          ['home-screen marker', (n) => exactlyOneId(n, 'home-screen')],
          ['nav list row', (n) => n.some((node) => node.resourceId.includes('nav-'))],
        ]),
      'home-screen'
    )
    await tapNavigation(config, 'nav-one-native-safe-area')
    const safeAreaNumbers = (nodes: Node[], prefix: string) => {
      const label = nodes
        .flatMap(nodeValues)
        .find((value) => value.startsWith(prefix))
      if (!label) return null
      const values = label
        .slice(prefix.length)
        .split(/[\sx]+/)
        .map(Number)
      if (values.some((value) => !Number.isFinite(value))) return null
      return values
    }
    await expect(
      'safe-area-live-insets',
      (nodes) =>
        diagnose(nodes, [
          ['edges control', (n) => exactlyOneId(n, 'one-native-safe-area-edges')],
          [
            'live outer insets',
            (n) => {
              const insets = safeAreaNumbers(n, 'Insets: ')
              return Boolean(
                insets &&
                insets.length === 4 &&
                insets[0] > 0 &&
                insets.every((v) => v >= 0)
              )
            },
          ],
          [
            'frame published',
            (n) => {
              const frame = safeAreaNumbers(n, 'Frame: ')
              return Boolean(frame && frame.length === 2 && frame.every((v) => v > 0))
            },
          ],
          ['initial metrics set', (n) => textIncludes(n, 'Initial: set')],
        ]),
      'one-native-safe-area-edges'
    )
    await expect(
      'safe-area-nested-overlap',
      (nodes) =>
        diagnose(nodes, [
          [
            'nested top is zero below the status bar',
            (n) => {
              const nested = safeAreaNumbers(n, 'NestedInsets: ')
              const outer = safeAreaNumbers(n, 'Insets: ')
              return Boolean(
                nested &&
                nested.length === 4 &&
                nested[0] === 0 &&
                nested.every((v) => Number.isFinite(v)) &&
                outer &&
                outer[2] >= nested[2]
              )
            },
          ],
        ]),
      'one-native-safe-area-edges'
    )

    // focusing the input and typing must not move the bottom inset: the
    // keyboard is capped by the stable inset. if this emulator shows no
    // soft keyboard the bottom is trivially stable and the typed text
    // still proves the input round-tripped.
    const beforeIme = safeAreaNumbers(snapshot(config).nodes, 'Insets: ')
    tapFresh(config, 'Safe-area input focus', { id: 'one-native-safe-area-input' })
    adbType(config, 'ada')
    await expect(
      'safe-area-ime-excluded',
      (nodes) =>
        diagnose(nodes, [
          ['typed text landed', (n) => textIncludes(n, 'ada')],
          [
            'bottom inset stable across input',
            (n) => {
              const insets = safeAreaNumbers(n, 'Insets: ')
              return Boolean(
                beforeIme &&
                insets &&
                insets.length === 4 &&
                insets[2] === beforeIme[2] &&
                insets.every((v) => Number.isFinite(v))
              )
            },
          ],
        ]),
      'one-native-safe-area-edges'
    )

    tapFresh(config, 'Safe-area edges toggle', {
      id: 'one-native-safe-area-edges',
      role: 'button',
      clickable: true,
    })
    await expect(
      'safe-area-edges-toggle',
      (nodes) => textIncludes(nodes, 'Edges: top'),
      'one-native-safe-area-edges'
    )

    // crypto on Android: presence (the native module resolved), two uuids
    // off the device that match rfc 4122 v4 and differ, a 16-byte
    // getRandomValues fill, regeneration keeping all of it valid, and an
    // Error: none sweep proving no js throw escaped. redbox detection
    // rides in waitFor via assertNoRedBox on every snapshot.
    pressBack(config)
    await tapNavigation(config, 'nav-one-native-crypto')
    const uuidV4 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    const hex32 = /^[0-9a-f]{32}$/
    const cryptoValue = (nodes: Node[], prefix: string) =>
      nodes
        .flatMap(nodeValues)
        .find((value) => value.startsWith(prefix))
        ?.slice(prefix.length)
    const cryptoValid = (nodes: Node[]) => {
      const first = cryptoValue(nodes, 'UUID1: ')
      const second = cryptoValue(nodes, 'UUID2: ')
      const random = cryptoValue(nodes, 'Random: ')
      return Boolean(
        first &&
          second &&
          random &&
          uuidV4.test(first) &&
          uuidV4.test(second) &&
          first !== second &&
          hex32.test(random)
      )
    }
    await expect(
      'crypto-module-present',
      (nodes) =>
        diagnose(nodes, [
          [
            'regenerate control',
            (n) => exactlyOneId(n, 'one-native-crypto-regenerate'),
          ],
          ['module marker', (n) => textIncludes(n, 'Module: available')],
        ]),
      'one-native-crypto-regenerate'
    )
    await expect(
      'crypto-uuids-valid',
      (nodes) =>
        diagnose(nodes, [
          ['two distinct v4 uuids plus a 16-byte fill', cryptoValid],
          ['no js error', (n) => textIncludes(n, 'Error: none')],
        ]),
      'one-native-crypto-regenerate'
    )
    tapFresh(config, 'Crypto regenerate', {
      id: 'one-native-crypto-regenerate',
      role: 'button',
      clickable: true,
    })
    await expect(
      'crypto-regenerate-valid',
      (nodes) =>
        diagnose(nodes, [
          ['regenerated values stay valid', cryptoValid],
          ['no js error after regenerate', (n) => textIncludes(n, 'Error: none')],
        ]),
      'one-native-crypto-regenerate'
    )

    writeFileSync(
      path.join(config.artifactDir, 'status.json'),
      JSON.stringify(
        {
          suite: 'one-native-android',
          result: 'passed',
          deviceId: config.deviceId,
          packageId: config.packageId,
          checks,
          checkCount: checks.length,
          completedAt: new Date().toISOString(),
        },
        null,
        2
      )
    )
    console.log(`PASS one-native-android ${checks.length} checks`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    let failureArtifacts: Check['artifacts'] | undefined
    let failureSnapshot: Snapshot | undefined
    try {
      failureSnapshot = dumpNodes(config)
    } catch (snapshotError) {
      console.error(
        `FAIL one-native-android failure snapshot: ${
          snapshotError instanceof Error ? snapshotError.message : String(snapshotError)
        }`
      )
    }
    const redbox = failureSnapshot ? redBoxMessage(failureSnapshot.nodes) : undefined
    const failureMessage = redbox
      ? `${message} | RedBox: ${redbox.slice(0, 500)}`
      : message
    if (failureSnapshot) {
      try {
        failureArtifacts = capture('failure', failureSnapshot, 'failed', failureMessage)
      } catch (captureError) {
        console.error(
          `FAIL one-native-android failure capture: ${
            captureError instanceof Error ? captureError.message : String(captureError)
          }`
        )
      }
    }
    writeFileSync(
      path.join(config.artifactDir, 'status.json'),
      JSON.stringify(
        {
          suite: 'one-native-android',
          result: 'failed',
          deviceId: config.deviceId,
          packageId: config.packageId,
          error: failureMessage,
          checks,
          failureArtifacts,
          completedAt: new Date().toISOString(),
        },
        null,
        2
      )
    )
    throw error
  }
}

try {
  const config = parse(process.argv.slice(2))
  await run(config)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`FAIL one-native-android: ${message}`)
  process.exitCode = 1
}
