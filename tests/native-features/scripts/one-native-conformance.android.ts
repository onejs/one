#!/usr/bin/env bun
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { stampAndroidDebugHost } from './android-debug-host'
import { parseUpdatesState, startUpdatesServer, updateIdsIn } from './updates-suite-server'

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
  // 'updates' drives a release apk against the static update server instead
  // of the debug proof screen against metro.
  suite: 'proof' | 'compose' | 'compose-badges' | 'compose-list-items' | 'compose-flow-row' | 'compose-icon-buttons' | 'compose-loading' | 'compose-surface' | 'compose-progress' | 'compose-segmented' | 'compose-pickers' | 'portal' | 'pager' | 'updates' | 'system' | 'system-app-icon' | 'system-share' | 'system-location'
  apkPath: string
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
    'Usage: bun tests/native-features/scripts/one-native-conformance.android.ts --device-id <SERIAL> --package-id <PACKAGE> [--artifact-dir <PATH>] [--timeout <MS>] [--metro-port <PORT>] [--suite compose|compose-badges|compose-list-items|compose-flow-row|compose-icon-buttons|compose-loading|compose-surface|compose-progress|compose-segmented|compose-pickers|portal|pager|updates|system|system-app-icon|system-share|system-location --apk-path <APK for updates>]'
  )

function parse(args: string[]): Config {
  let deviceId = ''
  let packageId = ''
  let artifactDir = '/tmp/one-native-android-proof'
  let timeout = 15_000
  let metroPort = 8081
  let suite: Config['suite'] = 'proof'
  let apkPath = ''
  if (process.env.RCT_METRO_PORT !== undefined && process.env.RCT_METRO_PORT !== '')
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
    else if (arg === '--suite') {
      const value = args[++index]
      if (value !== 'compose' && value !== 'compose-badges' && value !== 'compose-list-items' && value !== 'compose-flow-row' && value !== 'compose-icon-buttons' && value !== 'compose-loading' && value !== 'compose-surface' && value !== 'compose-progress' && value !== 'compose-segmented' && value !== 'compose-pickers' && value !== 'portal' && value !== 'pager' && value !== 'updates' && value !== 'system' && value !== 'system-app-icon' && value !== 'system-share' && value !== 'system-location') throw new Error(`Unknown suite: ${value}`)
      suite = value
    } else if (arg === '--apk-path') apkPath = args[++index] || ''
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
  if (suite === 'updates' && !apkPath)
    throw new Error('The updates suite requires --apk-path for a fresh install.')
  return { deviceId, packageId, artifactDir, timeout, metroPort, suite, apkPath }
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
}

function requireMetroReverse(config: Config) {
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
      // native-density png captures can exceed execFileSync's default 1 mib.
      maxBuffer: 16 * 1024 * 1024,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`adb ${['-s', config.deviceId, ...args].join(' ')} failed: ${detail}`)
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
  const pattern = /([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*(["'])(.*?)\2/g
  for (const match of source.matchAll(pattern)) result[match[1]] = xmlUnescape(match[3])
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
    bounds.left > viewport.left &&
    bounds.right < viewport.right &&
    bounds.top > viewport.top &&
    bounds.bottom < viewport.bottom
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
  tapMatching(config, name, `text "${text}"`, (node) => node.text === text)
}

function tapNode(config: Config, name: string, nodes: Node[], node: Node) {
  const target = clickableTarget(nodes, node)
  if (!target) throw new Error(`${name} found its target with no clickable ancestor.`)
  const bounds = validBounds(node, name)
  const x = Math.round((bounds.left + bounds.right) / 2)
  const y = Math.round((bounds.top + bounds.bottom) / 2)
  adbText(config, ['shell', 'input', 'tap', String(x), String(y)])
}

function tapMatching(
  config: Config,
  name: string,
  what: string,
  predicate: (node: Node) => boolean
) {
  const current = snapshot(config)
  const labeled = current.nodes.filter(predicate)
  if (labeled.length !== 1)
    throw new Error(
      `${name} resolved ${labeled.length} nodes with ${what}; exactly one is required.`
    )
  const target = clickableTarget(current.nodes, labeled[0])
  if (!target) throw new Error(`${name} found ${what} with no clickable ancestor.`)
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

function expandNotificationShade(config: Config) {
  const bounds = applicationBounds(snapshot(config).nodes)
  const x = Math.round(bounds.left + (bounds.right - bounds.left) / 4)
  const endY = Math.round(bounds.bottom * 0.65)
  writeFileSync(path.join(config.artifactDir, 'notification-shade-gesture.json'),
    JSON.stringify({ bounds, from: [x, 1], to: [x, endY], durationMs: 400 }, null, 2))
  adbText(config, ['shell', 'input', 'swipe', String(x), '1', String(x), String(endY), '400'])
}

function pressBack(config: Config) {
  adbText(config, ['shell', 'input', 'keyevent', '4'])
}

function clearDocumentsUi(config: Config) {
  // the documents fallback remembers its last location, which flaked the
  // cancel leg once, so start it cold. the package is aosp or gms flavored
  // per device, so clear whichever the device reports; when neither exists
  // the system picker path needs no documentsui and there is nothing to do.
  const packages = adbText(config, ['shell', 'pm', 'list', 'packages'])
  const match = packages
    .split(/\r?\n/)
    .map((line) => line.replace(/^package:/, '').trim())
    .find(
      (name) =>
        name === 'com.android.documentsui' || name === 'com.google.android.documentsui'
    )
  if (!match) return
  adbText(config, ['shell', 'pm', 'clear', match])
}

// the ime leg is vacuous unless the keyboard is actually raised, so fail
// loudly when it is not. grep runs on-device: the full dumpsys exceeds
// execFileSync's buffer.
function requireKeyboardShown(config: Config) {
  const shown = adbText(config, [
    'shell',
    'dumpsys input_method | grep -m1 mInputShown || true',
  ])
  if (!/mInputShown\s*=\s*true/.test(shown))
    throw new Error('safe-area-ime-excluded: the soft keyboard never raised')
}

function swipeFresh(config: Config, name: string, direction: 'forward' | 'backward' = 'forward') {
  const current = snapshot(config)
  const scrollables = current.nodes.filter((node) => node.scrollable === true)
  if (scrollables.length !== 1)
    throw new Error(
      `${name} resolved ${scrollables.length} scrollable nodes; exactly one is required.`
    )
  const bounds = validBounds(scrollables[0], name)
  const x = Math.round((bounds.left + bounds.right) / 2)
  const height = bounds.bottom - bounds.top
  const y1 = Math.round(bounds.top + height * (direction === 'forward' ? 0.72 : 0.3))
  const y2 = Math.round(bounds.top + height * (direction === 'forward' ? 0.3 : 0.72))
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
  const initial = snapshot(config)
  const initialTarget = matching(initial.nodes, { id: navId })[0]
  if (!initialTarget?.bounds || !visibleIn(initialTarget.bounds, applicationBounds(initial.nodes))) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const current = snapshot(config)
      if (matching(current.nodes, { id: 'nav-color-test' }).length === 1) break
      const previousPositions = current.nodes
        .filter((node) => node.resourceId.includes('nav-') && node.bounds)
        .map((node) => `${node.resourceId}:${node.bounds!.top}:${node.bounds!.bottom}`)
        .join('|')
      swipeFresh(config, 'Home navigation scroll view', 'backward')
      await waitFor(config, 'Home navigation scroll position moves toward the first row', (nodes) => {
        const nextPositions = nodes
          .filter((node) => node.resourceId.includes('nav-') && node.bounds)
          .map((node) => `${node.resourceId}:${node.bounds!.top}:${node.bounds!.bottom}`)
          .join('|')
        return nextPositions !== previousPositions
      }, undefined, 5_000)
    }
  }
  for (let attempt = 0; attempt < 40; attempt++) {
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
      }, (node) => {
        const bounds = validBounds(node, 'Android proof navigation row')
        const viewport = applicationBounds(current.nodes)
        if (!visibleIn(bounds, viewport)) throw new Error('Android navigation row is clipped at the viewport edge.')
        writeFileSync(path.join(config.artifactDir, `navigation-${navId}.json`),
          JSON.stringify({ node: shortNode(node), viewport }, null, 2))
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
  adbText(config, ['shell', 'am', 'start', '-W', '-n', launcherComponent(config)])
}

function launcherComponent(config: Config) {
  const component = adbText(config, [
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
  if (!component) throw new Error(`No launcher activity resolved for ${config.packageId}.`)
  return component
}

// wipe app data so permissions start undetermined like a fresh install.
function clearAppData(config: Config) {
  adbText(config, ['shell', 'pm', 'clear', config.packageId])
  stampDebugHost(config)
  relaunchApp(config)
}

function stampDebugHost(config: Config) {
  stampAndroidDebugHost(config.packageId, config.metroPort, (args) => adbText(config, args))
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
    detail?: (nodes: Node[]) => Record<string, unknown>,
    timeoutMs = config.timeout
  ) => {
    const result = await waitFor(config, name, predicate, missingMarker, timeoutMs)
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

  const joined = (nodes: Node[]) => nodes.flatMap(nodeValues).join('\n')
  const freshLeg = async (name: string) => {
    relaunchApp(config)
    await expect(
      `system-${name}-home`,
      (nodes) => exactlyOneId(nodes, 'home-screen'),
      'home-screen',
      undefined,
      60_000
    )
  }

  const pressHome = () =>
    adbText(config, ['shell', 'input', 'keyevent', '3'])
  const foregroundApp = () =>
    adbText(config, ['shell', 'am', 'start', '-n', launcherComponent(config)])

  const appIcon = async () => {
    // AppIcon: alias discovery, switch to TestAlternate and back, unknown
    // name rejection.
    await freshLeg('app-icon')
    await tapNavigation(config, 'nav-one-native-app-icon')
    await expect(
      'system-app-icon-mounted',
      (nodes) =>
        joined(nodes).includes('Startup support: true') &&
        joined(nodes).includes('Supported: true') &&
        joined(nodes).includes('Current icon: primary'),
      'one-native-app-icon-alternate'
    )
    let hostPid = adbText(config, ['shell', 'pidof', config.packageId]).trim()
    const hostIsPreserved = () =>
      adbText(config, ['shell', 'pidof', config.packageId]).trim() === hostPid &&
      adbText(config, ['shell', 'dumpsys', 'window']).split('\n').some((line) =>
        line.includes('mCurrentFocus=Window{') && line.includes(` ${config.packageId}/`)
      )
    writeFileSync(path.join(config.artifactDir, 'app-icon-before.json'), JSON.stringify({
      hostPid,
      packageState: adbText(config, ['shell', 'dumpsys', 'package', config.packageId]),
      activityState: adbText(config, ['shell', 'dumpsys', 'activity', 'activities']),
    }, null, 2))
    tapFresh(config, 'system-app-icon-alternate', {
      id: 'one-native-app-icon-alternate',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-app-icon-changed',
      (nodes) =>
        joined(nodes).includes('Icon result: changed') &&
        joined(nodes).includes('Current icon: TestAlternate') &&
        hostIsPreserved() && launcherComponent(config).endsWith('.TestAlternate'),
      'one-native-app-icon-primary',
      () => ({ hostPid, launcher: launcherComponent(config) })
    )
    await freshLeg('app-icon-relaunch')
    await tapNavigation(config, 'nav-one-native-app-icon')
    await expect(
      'system-app-icon-persisted',
      (nodes) => joined(nodes).includes('Supported: true') &&
        joined(nodes).includes('Current icon: TestAlternate'),
      'one-native-app-icon-primary'
    )
    hostPid = adbText(config, ['shell', 'pidof', config.packageId]).trim()
    tapFresh(config, 'system-app-icon-primary', {
      id: 'one-native-app-icon-primary',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-app-icon-restored',
      (nodes) =>
        joined(nodes).includes('Icon result: changed') &&
        joined(nodes).includes('Current icon: primary') &&
        hostIsPreserved() && launcherComponent(config).endsWith('.Primary'),
      'one-native-app-icon-invalid',
      () => ({ hostPid, launcher: launcherComponent(config) })
    )
    tapFresh(config, 'system-app-icon-invalid', {
      id: 'one-native-app-icon-invalid',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-app-icon-invalid',
      (nodes) => joined(nodes).includes('invalid:E_APP_ICON_INPUT') &&
        joined(nodes).includes('Current icon: primary') && hostIsPreserved() &&
        launcherComponent(config).endsWith('.Primary'),
      'one-native-app-icon-invalid'
    )
  }

  const share = async () => {
    // Share: text/url completion through the chooser Copy target, file
    // dismissal, busy guard, and all four input codes.
    await freshLeg('share')
    await tapNavigation(config, 'nav-one-native-share')
    await expect(
      'system-share-mounted',
      (nodes) => textIncludes(nodes, 'Status: idle') && textIncludes(nodes, 'Busy: none'),
      'one-native-share-run'
    )
    tapFresh(config, 'system-share-run', {
      id: 'one-native-share-run',
      role: 'button',
      clickable: true,
    })
    await expect('system-share-chooser', (nodes) =>
      nodes.filter((node) => node.contentDescription === 'Copy text').length === 1
    )
    // select the system copy action; app targets may also be labelled copy.
    tapMatching(config, 'system-share-copy', 'system Copy text action',
      (node) => node.contentDescription === 'Copy text'
    )
    // the completed text share advances the fixture to the file chooser,
    // which covers the app: uiautomator sees the chooser, not the status
    // text behind it, so assert the chooser itself. the passed check below
    // pins the copy completion through the result triple.
    await expect(
      'system-share-file-sharing',
      (nodes) =>
        joined(nodes).includes('Sharing 1 file') &&
        joined(nodes).includes('one-native-share-proof.txt'),
      'one-native-share-run',
      undefined,
      30_000
    )
    pressBack(config)
    await expect(
      'system-share-passed',
      (nodes) => {
        const text = joined(nodes)
        return (
          text.includes('Status: passed') &&
          text.includes('Busy: E_SHARE_BUSY') &&
          text.includes('text=true; activity=none; file=false; empty=E_SHARE_ITEMS; missing=E_SHARE_FILE; url=E_SHARE_URL; blank=E_SHARE_ITEMS; clipboard=true')
        )
      },
      'one-native-share-run',
      undefined,
      30_000
    )
  }

  const location = async () => {
    // Location: prompt, concurrent request, current fix, watch moves,
    // geocoding, background watch with its notification, revoke negative.
    await freshLeg('location')
    await tapNavigation(config, 'nav-one-native-location')
    await expect(
      'system-location-undetermined',
      (nodes) => joined(nodes).includes('Permission: notDetermined'),
      'one-native-location-request'
    )
    adbText(config, ['emu', 'geo', 'fix', '-122.4194', '37.7749'])
    tapFresh(config, 'system-location-request', {
      id: 'one-native-location-request',
      role: 'button',
      clickable: true,
    })
    await waitFor(config, 'system-location-prompt', (nodes) =>
      textIncludes(nodes, 'While using the app')
    )
    tapByText(config, 'system-location-allow', 'While using the app')
    await expect(
      'system-location-granted',
      (nodes) => {
        const text = joined(nodes)
        return (
          text.includes('Permission: whenInUse') &&
          text.includes('Concurrent: whenInUse,whenInUse')
        )
      },
      'one-native-location-current'
    )
    tapFresh(config, 'system-location-current', {
      id: 'one-native-location-current',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-location-position',
      (nodes) => joined(nodes).includes('Position: 37.7749,-122.4194'),
      'one-native-location-watch'
    )
    tapFresh(config, 'system-location-watch', {
      id: 'one-native-location-watch',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-location-watch-first',
      (nodes) => joined(nodes).includes('Watch: 37.7749,-122.4194'),
      'one-native-location-stop-watch'
    )
    adbText(config, ['emu', 'geo', 'fix', '-122.4094', '37.7849'])
    await expect(
      'system-location-watch-moved',
      (nodes) => joined(nodes).includes('Watch: 37.7849,-122.4094'),
      'one-native-location-stop-watch'
    )
    tapFresh(config, 'system-location-stop-watch', {
      id: 'one-native-location-stop-watch',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-location-watch-stopped',
      (nodes) => joined(nodes).includes('Watch: stopped'),
      'one-native-location-forward'
    )
    tapFresh(config, 'system-location-forward', {
      id: 'one-native-location-forward',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-location-forward',
      (nodes) => /Forward: [1-9]\d*:37\.3\d,-122\.0\d/.test(joined(nodes)),
      'one-native-location-reverse',
      undefined,
      45_000
    )
    tapFresh(config, 'system-location-reverse', {
      id: 'one-native-location-reverse',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-location-reverse',
      (nodes) => joined(nodes).includes('Reverse: San Francisco'),
      'one-native-location-background-watch',
      undefined,
      45_000
    )
    const serviceDump = () =>
      adbText(config, ['shell', 'dumpsys', 'activity', 'services', config.packageId])
    const locationService = () => serviceDump().split(/(?=  \* ServiceRecord\{)/).find(
      (record) => record.includes(`${config.packageId}/dev.onejs.onenative.OneLocationService`)
    ) ?? ''
    const serviceIsForeground = () => {
      const record = locationService()
      return record.includes('isForeground=true foregroundId=4301 types=0x00000008') &&
        record.includes('channel=one-location')
    }
    const notificationDump = () => adbText(config, ['shell', 'dumpsys', 'notification', '--noredact'])
    const locationNotification = () => notificationDump().split(/(?=    NotificationRecord\()/).find(
      (record) => record.startsWith('    NotificationRecord(') &&
        record.split('\n')[0].includes(`pkg=${config.packageId} `) &&
        record.split('\n')[0].includes(' id=4301 ')
    ) ?? ''
    const notificationPermission = (granted: boolean) =>
      adbText(config, ['shell', 'dumpsys', 'package', config.packageId]).includes(
        `android.permission.POST_NOTIFICATIONS: granted=${granted},`
      )
    const backgroundFile = () => adbText(config, ['shell', 'run-as', config.packageId,
      'cat', 'files/Documents/one-native-location-background-proof.txt']).trim()
    const retainLocationState = (phase: string) => {
      writeFileSync(path.join(config.artifactDir, `location-${phase}-services.txt`), serviceDump())
      writeFileSync(path.join(config.artifactDir, `location-${phase}-notifications.txt`), notificationDump())
      writeFileSync(path.join(config.artifactDir, `location-${phase}-permissions.txt`),
        adbText(config, ['shell', 'dumpsys', 'package', config.packageId]))
      writeFileSync(path.join(config.artifactDir, `location-${phase}-background.txt`), backgroundFile())
    }
    const backgroundLeg = async (phase: 'denied' | 'granted', longitude: string, latitude: string) => {
      tapFresh(config, `system-location-background-${phase}-watch`, {
        id: 'one-native-location-background-watch',
        role: 'button',
        clickable: true,
      })
      await expect(
        `system-location-background-${phase}-started`,
        (nodes) => joined(nodes).includes('Background watch: active:') && backgroundFile() === 'starting',
        'one-native-location-stop-background-watch'
      )
      pressHome()
      await expect(
        `system-location-background-${phase}-service`,
        () => serviceIsForeground() && notificationPermission(phase === 'granted') &&
          (phase === 'denied' ? locationNotification() === '' :
            locationNotification().includes('Location updates active') &&
            locationNotification().includes('FOREGROUND_SERVICE')),
        undefined,
        () => ({ service: locationService(), notification: locationNotification() })
      )
      retainLocationState(phase)
      if (phase === 'granted') {
        expandNotificationShade(config)
        writeFileSync(path.join(config.artifactDir, 'location-granted-shade-window.txt'),
          adbText(config, ['shell', 'dumpsys', 'window']))
        await expect('system-location-notification-shade-opened',
          (nodes) => nodes.some((node) => node.attrs.package === 'com.android.systemui'))
        await expect(
          'system-location-foreground-notification',
          (nodes) => joined(nodes).includes('Location updates active') && serviceIsForeground()
        )
        pressBack(config)
      }
      adbText(config, ['emu', 'geo', 'fix', longitude, latitude])
      const position = `background:${latitude},${longitude}`
      await waitFor(config, `system-location-background-${phase}-file`,
        () => backgroundFile() === position)
      retainLocationState(`${phase}-delivered`)
      foregroundApp()
      await expect(
        `system-location-background-${phase}-delivered`,
        (nodes) => joined(nodes).includes(`Background watch: ${position}`),
        'one-native-location-stop-background-watch',
        () => ({ persistedBackgroundPosition: backgroundFile() }),
        30_000
      )
      tapFresh(config, `system-location-stop-background-${phase}-watch`, {
        id: 'one-native-location-stop-background-watch',
        role: 'button',
        clickable: true,
      })
      await expect(
        `system-location-background-${phase}-stopped`,
        (nodes) => joined(nodes).includes('Background watch: stopped') && locationService() === '' &&
          locationNotification() === '',
        'one-native-location-watch'
      )
      retainLocationState(`${phase}-stopped`)
    }
    // denial hides the drawer notice but must preserve background delivery.
    if (!notificationPermission(false))
      throw new Error('fresh location proof unexpectedly has notification permission')
    await backgroundLeg('denied', '-122.4044', '37.7899')
    // visibility requires its own notification grant, independent of location.
    adbText(config, ['shell', 'pm', 'grant', config.packageId, 'android.permission.POST_NOTIFICATIONS'])
    if (!notificationPermission(true))
      throw new Error('location notification visibility precondition was not granted')
    await backgroundLeg('granted', '-122.3994', '37.7949')
    tapFresh(config, 'system-location-revoke-watch', {
      id: 'one-native-location-watch',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-location-revoke-watch-live',
      (nodes) => /Watch: 37\.79\d\d,-122\.3\d\d\d/.test(joined(nodes)),
      'one-native-location-stop-watch'
    )
    const revokedPid = adbText(config, ['shell', 'pidof', config.packageId]).trim()
    if (!/^\d+$/.test(revokedPid))
      throw new Error('location revocation requires one live fixture process')
    adbText(config, [
      'shell',
      'pm',
      'revoke',
      config.packageId,
      'android.permission.ACCESS_FINE_LOCATION',
    ])
    adbText(config, [
      'shell',
      'pm',
      'revoke',
      config.packageId,
      'android.permission.ACCESS_COARSE_LOCATION',
    ])
    const foregroundPermissionsDenied = () => {
      const permissions = adbText(config, ['shell', 'dumpsys', 'package', config.packageId])
      return ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'].every((permission) =>
        permissions.includes(`android.permission.${permission}: granted=false,`))
    }
    await expect('system-location-revoked-process', () => {
      const events = adbText(config, ['logcat', '-d', '-b', 'events'])
      return foregroundPermissionsDenied() && locationService() === '' &&
        events.split('\n').some((line) => line.includes(`,${revokedPid},${config.packageId},`) &&
          line.includes('am_kill') && line.includes('permissions revoked'))
    }, undefined, () => ({ revokedPid, permissionsDenied: foregroundPermissionsDenied() }))
    writeFileSync(path.join(config.artifactDir, 'location-revoked-events.txt'),
      adbText(config, ['logcat', '-d', '-b', 'events']))
    foregroundApp()
    await expect('system-location-revoked-home', (nodes) => {
      const currentPid = adbText(config, ['shell', 'pidof', config.packageId]).trim()
      return exactlyOneId(nodes, 'home-screen') && /^\d+$/.test(currentPid) &&
        currentPid !== revokedPid && foregroundPermissionsDenied()
    }, 'home-screen', () => ({ revokedPid,
      currentPid: adbText(config, ['shell', 'pidof', config.packageId]).trim() }), 30_000)
    await tapNavigation(config, 'nav-one-native-location')
    await expect(
      'system-location-revoked',
      (nodes) => joined(nodes).includes('Permission: denied') &&
        joined(nodes).includes('Watch: none'),
      'one-native-location-watch',
      undefined,
      30_000
    )
    tapFresh(config, 'system-location-revoked-watch', {
      id: 'one-native-location-watch', role: 'button', clickable: true,
    })
    await expect('system-location-revoked-watch-rejected',
      (nodes) => joined(nodes).includes('Watch: error: E_LOCATION_PERMISSION') &&
        foregroundPermissionsDenied(), 'one-native-location-current')
    tapFresh(config, 'system-location-revoked-current', {
      id: 'one-native-location-current', role: 'button', clickable: true,
    })
    await expect('system-location-revoked-current-rejected',
      (nodes) => joined(nodes).includes('Position: error: E_LOCATION_PERMISSION'),
      'one-native-location-background-watch')
    tapFresh(config, 'system-location-revoked-background', {
      id: 'one-native-location-background-watch', role: 'button', clickable: true,
    })
    await expect('system-location-revoked-background-rejected',
      (nodes) => joined(nodes).includes('Background watch: error: E_LOCATION_PERMISSION') &&
        locationService() === '' && locationNotification() === '',
      'one-native-location-refresh')
    retainLocationState('revoked')
    adbText(config, [
      'shell',
      'pm',
      'grant',
      config.packageId,
      'android.permission.ACCESS_FINE_LOCATION',
    ])
    adbText(config, [
      'shell',
      'pm',
      'grant',
      config.packageId,
      'android.permission.ACCESS_COARSE_LOCATION',
    ])
  }

  // Ten Android system services through their existing fixtures: device
  // snapshot, keep-awake round trip, orientation locks, share chooser
  // completion, print sheet cancel, quick-action cold/warm delivery,
  // alternate icon switch, location permission/position/watch/geocode,
  // map-services search split, and biometric status. Each leg asserts
  // positives plus the platform negatives through real Kotlin.
  const system = async () => {
    const sysText = (nodes: Node[], id: string, expected: string) =>
      matching(nodes, { id }).some((node) =>
        nodeValues(node).some((value) => value.includes(expected))
      )


    // Fresh permissions and prefs; the debug host stamp survives.
    clearAppData(config)
    await expect(
      'system-home',
      (nodes) => exactlyOneId(nodes, 'home-screen'),
      'home-screen',
      undefined,
      90_000
    )

    // filesystem: valid binary writes and rejected writes preserve both destinations.
    await freshLeg('file-system')
    await tapNavigation(config, 'nav-one-native-file-system')
    await expect(
      'system-file-system-mounted',
      (nodes) => textIncludes(nodes, 'Status: idle'),
      'one-native-file-system-run'
    )
    tapFresh(config, 'system-file-system-run', {
      id: 'one-native-file-system-run',
      clickable: true,
    })
    await expect(
      'system-file-system-lifecycle',
      (nodes) =>
        textIncludes(nodes, 'Status: passed') &&
        textIncludes(
          nodes,
          'Result: text=Hello One; bytes=0,1,2,3; entries=binary.dat,moved.txt,note.txt; ' +
          'moved=true; recursive=true; missing=false; ' +
          'errors=E_FILE_URI,E_FILE_NOT_FOUND,E_FILE_EXISTS,E_FILE_ENCODING,E_FILE_PERMISSION'
        ),
      'one-native-file-system-run'
    )

    // Device: full snapshot from Build/Locale, emulator flagged.
    await freshLeg('device')
    await tapNavigation(config, 'nav-one-native-device')
    await expect(
      'system-device-mounted',
      (nodes) => sysText(nodes, 'one-native-device-read', 'Read device'),
      'one-native-device-read'
    )
    tapFresh(config, 'system-device-read', {
      id: 'one-native-device-read',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-device-report',
      (nodes) => {
        const text = joined(nodes)
        return (
          /Model: \S+/.test(text) &&
          text.includes('System: Android') &&
          text.includes('Idiom: phone') &&
          text.includes('Simulator: true') &&
          /Vendor: [0-9a-fA-F]+/.test(text) &&
          !text.includes('pending') &&
          text.includes('Error: none')
        )
      },
      'one-native-device-read'
    )

    // KeepAwake: enable/disable round trip, validation, restore, and a
    // home/foreground cycle proving the resume path holds.
    await freshLeg('keep-awake')
    await tapNavigation(config, 'nav-one-native-keep-awake')
    tapFresh(config, 'system-keep-awake-run', {
      id: 'one-native-keep-awake-run',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-keep-awake-report',
      (nodes) => {
        const text = joined(nodes)
        return (
          text.includes('Status: done') &&
          text.includes('Initial: false') &&
          text.includes('Enabled: true') &&
          text.includes('Disabled: false') &&
          text.includes('Invalid: KeepAwake.setEnabled: enabled must be a boolean') &&
          text.includes('Restored: false')
        )
      },
      'one-native-keep-awake-run'
    )
    pressHome()
    await Bun.sleep(1000)
    foregroundApp()
    await expect(
      'system-keep-awake-foregrounded',
      (nodes) => sysText(nodes, 'one-native-keep-awake-run', 'Run keep-awake checks'),
      'one-native-keep-awake-run'
    )
    tapFresh(config, 'system-keep-awake-rerun', {
      id: 'one-native-keep-awake-run',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-keep-awake-report-after-resume',
      (nodes) => joined(nodes).includes('Status: done'),
      'one-native-keep-awake-run'
    )

    // Orientation: read, both locks with flipped dimensions, listener
    // events, unlock. The landscapeLeft lock pins the left/right mapping.
    await freshLeg('orientation')
    await tapNavigation(config, 'nav-one-native-screen-orientation')
    tapFresh(config, 'system-orientation-read', {
      id: 'one-native-orientation-read',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-orientation-portrait',
      (nodes) =>
        joined(nodes).includes('Orientation: portrait') &&
        joined(nodes).includes('Status: read'),
      'one-native-orientation-read'
    )
    tapFresh(config, 'system-orientation-landscape', {
      id: 'one-native-orientation-landscape',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-orientation-landscape-left',
      (nodes) => {
        const text = joined(nodes)
        const dimensions = /Dimensions: (\d+)x(\d+)/.exec(text)
        return (
          text.includes('Status: locked-landscapeLeft') &&
          text.includes('Orientation: landscapeLeft') &&
          text.includes('landscapeLeft') &&
          dimensions !== null &&
          Number(dimensions[1]) > Number(dimensions[2])
        )
      },
      'one-native-orientation-landscape',
      undefined,
      30_000
    )
    tapFresh(config, 'system-orientation-portrait-lock', {
      id: 'one-native-orientation-portrait',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-orientation-portrait-locked',
      (nodes) => {
        const text = joined(nodes)
        return (
          text.includes('Status: locked-portrait') &&
          text.includes('Orientation: portrait')
        )
      },
      'one-native-orientation-portrait',
      undefined,
      30_000
    )
    tapFresh(config, 'system-orientation-unlock', {
      id: 'one-native-orientation-unlock',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-orientation-unlocked',
      (nodes) =>
        joined(nodes).includes('Status: unlocked') &&
        joined(nodes).includes('Orientation: portrait'),
      'one-native-orientation-unlock',
      undefined,
      30_000
    )

    await share()

    // Print: cancel the system sheet, then busy and input codes; a second
    // leg with the print service disabled proves honest unavailability.
    adbText(config, [
      'shell',
      'settings',
      'put',
      'secure',
      'enabled_print_services',
      'com.android.bips/.BuiltInPrintService',
    ])
    await freshLeg('print')
    await tapNavigation(config, 'nav-one-native-print')
    tapFresh(config, 'system-print-run', {
      id: 'one-native-print-run',
      role: 'button',
      clickable: true,
    })
    // the system sheet owns the visible tree while the fixture is behind it.
    // require the rendered pdf page and actual window focus before cancelling.
    await expect(
      'system-print-sheet',
      (nodes) => {
        const pages = matching(nodes, {
          id: 'com.android.printspooler:id/preview_page',
          checked: true,
        })
        return (
          pages.length === 1 &&
          pages[0].contentDescription === 'Page 1 of 1' &&
          exactlyOneId(nodes, 'com.android.printspooler:id/cancel_button') &&
          /mCurrentFocus=Window\{[^\n]*com\.android\.printspooler\//.test(
            adbText(config, ['shell', 'dumpsys', 'window'])
          )
        )
      },
      'com.android.printspooler:id/preview_page',
      undefined,
      30_000
    )
    pressBack(config)
    await expect(
      'system-print-report',
      (nodes) => {
        const text = joined(nodes)
        return (
          text.includes('Status: done') &&
          text.includes('Available: true') &&
          /PdfBytes: \d+/.test(text) &&
          text.includes('Busy: E_PRINT_BUSY') &&
          text.includes('Completed: false') &&
          text.includes('RemoteURI: E_PRINT_URI') &&
          text.includes('Missing: E_PRINT_FILE') &&
          text.includes('BadPDF: E_PRINT_PDF') &&
          text.includes('InvalidType: Print.printPdf: fileUri must be a non-empty string') &&
          text.includes(
            'InvalidName: Print.printPdf: jobName must be a non-empty string when provided'
          )
        )
      },
      'one-native-print-run',
      undefined,
      90_000
    )
    adbText(config, ['shell', 'settings', 'delete', 'secure', 'enabled_print_services'])
    relaunchApp(config)
    await expect(
      'system-print-relaunch-home',
      (nodes) => exactlyOneId(nodes, 'home-screen'),
      'home-screen'
    )
    await tapNavigation(config, 'nav-one-native-print')
    tapFresh(config, 'system-print-unavailable-run', {
      id: 'one-native-print-run',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-print-unavailable',
      (nodes) => {
        const text = joined(nodes)
        return (
          text.includes('Available: false') &&
          text.includes('Status: failed system printing is unavailable')
        )
      },
      'one-native-print-run'
    )
    adbText(config, [
      'shell',
      'settings',
      'put',
      'secure',
      'enabled_print_services',
      'com.android.bips/.BuiltInPrintService',
    ])

    // QuickActions: set/get round trip, validation, warm tap exactly once,
    // cold start into the initial slot, clear.
    await freshLeg('quick-actions')
    await tapNavigation(config, 'nav-one-native-quick-actions')
    tapFresh(config, 'system-quick-actions-set', {
      id: 'one-native-quick-actions-set',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-quick-actions-registered',
      (nodes) =>
        joined(nodes).includes(
          'Registered: 1:dev.vxrn.native.tests.quick-open:Open Quick Actions:One proof action'
        ),
      'one-native-quick-actions-set'
    )
    tapFresh(config, 'system-quick-actions-invalid', {
      id: 'one-native-quick-actions-invalid',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-quick-actions-invalid',
      (nodes) =>
        joined(nodes).includes('Invalid: rejected,rejected,rejected,rejected,rejected'),
      'one-native-quick-actions-invalid'
    )
    const quickAction = 'dev.vxrn.native.tests.quick-open'
    const fireQuickAction = () =>
      adbText(config, [
        'shell',
        'am',
        'start',
        '-n',
        launcherComponent(config),
        '-a',
        'dev.onejs.one.QUICK_ACTION',
        '--es',
        'dev.onejs.one.QUICK_ACTION_ID',
        quickAction,
      ])
    fireQuickAction()
    await expect(
      'system-quick-actions-warm',
      (nodes) => joined(nodes).includes(`Warm: 1:${quickAction}`),
      'one-native-quick-actions-set'
    )
    adbText(config, ['shell', 'am', 'force-stop', config.packageId])
    fireQuickAction()
    await expect(
      'system-quick-actions-cold-home',
      (nodes) => exactlyOneId(nodes, 'home-screen'),
      'home-screen',
      undefined,
      90_000
    )
    await tapNavigation(config, 'nav-one-native-quick-actions')
    await expect(
      'system-quick-actions-initial',
      (nodes) => joined(nodes).includes(`Initial: ${quickAction}`),
      'one-native-quick-actions-clear-initial'
    )
    tapFresh(config, 'system-quick-actions-clear-initial', {
      id: 'one-native-quick-actions-clear-initial',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-quick-actions-initial-cleared',
      (nodes) => joined(nodes).includes('Initial: null'),
      'one-native-quick-actions-clear-initial'
    )
    tapFresh(config, 'system-quick-actions-clear', {
      id: 'one-native-quick-actions-clear',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-quick-actions-cleared',
      (nodes) => joined(nodes).includes('Registered: cleared:0'),
      'one-native-quick-actions-clear'
    )

    await appIcon()

    await location()

    // MapServices: geocoder search positive, empty, and input guard, with
    // the unavailable split held for the other three methods.
    await freshLeg('map-services')
    await tapNavigation(config, 'nav-one-native-map-services')
    tapFresh(config, 'system-map-services-run', {
      id: 'one-native-map-services-run',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-map-services-report',
      (nodes) =>
        /Map services: android-passed: .+; empty=true; input=E_MAP_INPUT; split=true/.test(
          joined(nodes)
        ),
      'one-native-map-services-run',
      undefined,
      90_000
    )

    // LocalAuthentication: status triple on an unenrolled emulator and the
    // matching evaluate rejection through the real prompt path.
    await freshLeg('local-auth')
    await tapNavigation(config, 'nav-one-native-local-authentication')
    const authStatus = await expect(
      'system-local-auth-status',
      (nodes) =>
        /Status: (true|false):(none|touchID|faceID):(\S+)/.test(joined(nodes)),
      'one-native-local-auth-evaluate'
    )
    const authTriple = /Status: (true|false):(none|touchID|faceID):(\S+)/.exec(
      joined(authStatus.nodes)
    )
    if (!authTriple) throw new Error('biometric status triple missing')
    console.log(`PASS system-local-auth-triple ${authTriple[0]}`)
    tapFresh(config, 'system-local-auth-evaluate', {
      id: 'one-native-local-auth-evaluate',
      role: 'button',
      clickable: true,
    })
    if (authTriple[1] === 'false' && authTriple[3] === '11') {
      await expect(
        'system-local-auth-not-enrolled',
        (nodes) => joined(nodes).includes('Result: error: E_LOCAL_AUTH_NOT_ENROLLED'),
        'one-native-local-auth-refresh'
      )
    } else if (authTriple[1] === 'false' && authTriple[3] === '12') {
      await expect(
        'system-local-auth-no-hardware',
        (nodes) => joined(nodes).includes('Result: error: E_LOCAL_AUTH_FAILED'),
        'one-native-local-auth-refresh'
      )
    } else {
      throw new Error(`unexpected biometric status for proof branching: ${authTriple[0]}`)
    }

    // ScreenCapture: the window-manager recording state reads inactive on
    // a quiet device with no events delivered at registration, window
    // capture writes a real PNG file with dimensions and bytes, delete
    // removes it, the screenshot listener stays silent without a real
    // screenshot, the remover is idempotent, and state still serves after
    // a background/foreground cycle re-registers the activity callback.
    await freshLeg('screen-capture')
    await tapNavigation(config, 'nav-one-native-screen-capture')
    await expect(
      'system-screen-capture-initial',
      (nodes) => {
        const text = joined(nodes)
        return (
          text.includes('Capture state: inactive') &&
          text.includes('State events: none') &&
          text.includes('Screenshot count: 0')
        )
      },
      'one-native-screen-capture-window'
    )
    tapFresh(config, 'system-screen-capture-window', {
      id: 'one-native-screen-capture-window',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-screen-capture-captured',
      (nodes) => {
        const text = joined(nodes)
        const dimensions = /Window dimensions: (\d+)x(\d+)/.exec(text)
        const bytes = /Window bytes: (\d+)/.exec(text)
        return (
          text.includes('Window capture: captured') &&
          !text.includes('Window file: none') &&
          dimensions !== null &&
          Number(dimensions[1]) > 0 &&
          Number(dimensions[2]) > 0 &&
          bytes !== null &&
          Number(bytes[1]) > 0
        )
      },
      'one-native-screen-capture-delete'
    )
    tapFresh(config, 'system-screen-capture-delete', {
      id: 'one-native-screen-capture-delete',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-screen-capture-deleted',
      (nodes) => joined(nodes).includes('Window capture: deleted'),
      'one-native-screen-capture-unsubscribe'
    )
    tapFresh(config, 'system-screen-capture-unsubscribe', {
      id: 'one-native-screen-capture-unsubscribe',
      role: 'button',
      clickable: true,
    })
    tapFresh(config, 'system-screen-capture-unsubscribe-again', {
      id: 'one-native-screen-capture-unsubscribe',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-screen-capture-unsubscribed',
      (nodes) =>
        joined(nodes).includes('Listening: false') &&
        joined(nodes).includes('Screenshot count: 0'),
      'one-native-screen-capture-refresh'
    )
    pressHome()
    await Bun.sleep(1000)
    foregroundApp()
    tapFresh(config, 'system-screen-capture-rerefresh', {
      id: 'one-native-screen-capture-refresh',
      role: 'button',
      clickable: true,
    })
    await expect(
      'system-screen-capture-after-resume',
      (nodes) =>
        joined(nodes).includes('Capture state: inactive') &&
        joined(nodes).includes('Status: refreshed'),
      'one-native-screen-capture-refresh'
    )
  }

  // One.UI.Portal: hosted content keeps its React context and state, lays
  // out against the host (8dp in from its corner at any host size), returns
  // to its own position when the host unmounts and follows a renamed host.
  const portal = async () => {
    await tapNavigation(config, 'nav-one-native-portal')
    const portalBounds = (nodes: Node[], id: string) => matching(nodes, { id })[0]?.bounds
    let dp = 0
    const cornered = (nodes: Node[], host: string) => {
      const box = portalBounds(nodes, host)
      const badge = portalBounds(nodes, 'portal-badge')
      return !!box && !!badge && dp > 0 &&
        Math.abs(box.right - 8 * dp - badge.right) <= 2 &&
        Math.abs(box.bottom - 8 * dp - badge.bottom) <= 2
    }
    const sized = (nodes: Node[], id: string, width: number, height: number) => {
      const box = portalBounds(nodes, id)
      return !!box && dp > 0 &&
        Math.abs(box.right - box.left - width * dp) <= 2 &&
        Math.abs(box.bottom - box.top - height * dp) <= 2
    }
    const inside = (nodes: Node[], inner: string, outer: string) => {
      const a = portalBounds(nodes, inner)
      const b = portalBounds(nodes, outer)
      return !!a && !!b && a.left >= b.left && a.top >= b.top && a.right <= b.right && a.bottom <= b.bottom
    }
    const mounted = await expect(
      'portal-mounted',
      (nodes) =>
        diagnose(nodes, [
          ['host mounted', (n) => exactlyOneId(n, 'portal-host')],
          ['other host mounted', (n) => exactlyOneId(n, 'portal-other')],
          ['badge carries the source context', (n) => textIncludes(n, 'context:0')],
          ['inline portal renders in place', (n) => textIncludes(n, 'inline child')],
        ]),
      'portal-host'
    )
    // the second host is a fixed 220dp wide, which gives the device density.
    const other = portalBounds(mounted.nodes, 'portal-other')!
    dp = (other.right - other.left) / 220
    await expect('portal-hosted-layout', (nodes) =>
      diagnose(nodes, [
        ['host is 180x120', (n) => sized(n, 'portal-host', 180, 120)],
        ['badge in host corner', (n) => cornered(n, 'portal-host')],
      ]))
    tapFresh(config, 'Portal badge', { id: 'portal-badge', clickable: true })
    await expect('portal-hosted-press', (nodes) => textIncludes(nodes, 'context:1'))
    tapFresh(config, 'Portal resize', { id: 'portal-resize', clickable: true })
    await expect('portal-host-resize', (nodes) =>
      diagnose(nodes, [
        ['host is 280x180', (n) => sized(n, 'portal-host', 280, 180)],
        ['badge follows the corner', (n) => cornered(n, 'portal-host')],
        ['state kept', (n) => textIncludes(n, 'context:1')],
      ]))
    tapFresh(config, 'Portal resize back', { id: 'portal-resize', clickable: true })
    await expect('portal-host-resize-back', (nodes) =>
      sized(nodes, 'portal-host', 180, 120) && cornered(nodes, 'portal-host'))
    tapFresh(config, 'Portal replace', { id: 'portal-replace', clickable: true })
    await expect('portal-named-replacement', (nodes) =>
      diagnose(nodes, [
        ['replacement hosted', (n) => inside(n, 'portal-replacement', 'portal-host')],
        ['first portal displaced', (n) => matching(n, { id: 'portal-badge' }).length === 0],
      ]))
    tapFresh(config, 'Portal restore', { id: 'portal-replace', clickable: true })
    await expect('portal-replacement-removed', (nodes) =>
      textIncludes(nodes, 'context:1') && cornered(nodes, 'portal-host') &&
      matching(nodes, { id: 'portal-replacement' }).length === 0)
    tapFresh(config, 'Portal host off', { id: 'portal-toggle-host', clickable: true })
    await expect('portal-host-unmounted', (nodes) =>
      diagnose(nodes, [
        ['host gone', (n) => matching(n, { id: 'portal-host' }).length === 0],
        ['badge back in its source', (n) => inside(n, 'portal-badge', 'portal-source')],
        ['state kept', (n) => textIncludes(n, 'context:1')],
      ]))
    tapFresh(config, 'Portal host on', { id: 'portal-toggle-host', clickable: true })
    await expect('portal-host-remounted', (nodes) =>
      cornered(nodes, 'portal-host') && textIncludes(nodes, 'context:1'))
    tapFresh(config, 'Portal switch host', { id: 'portal-switch', clickable: true })
    await expect('portal-switched-host', (nodes) =>
      diagnose(nodes, [
        ['badge in the other host corner', (n) => cornered(n, 'portal-other')],
        ['state kept', (n) => textIncludes(n, 'context:1')],
      ]))
  }
  // One.UI.Pager on ViewPager2: commands, drags, disabled scrolling and
  // removing the selected page, each judged by the reported page and the
  // page actually filling the stage.
  const pager = async () => {
    await tapNavigation(config, 'nav-one-ui-pager')
    const pagerSettled = (nodes: Node[], page: number) => {
      const stage = matching(nodes, { id: 'one-ui-pager-stage' })[0]?.bounds
      const slide = matching(nodes, { id: `one-ui-pager-slide-${page}` })[0]?.bounds
      return diagnose(nodes, [
        [`selected:${page}`, (n) => textIncludes(n, `selected:${page}`)],
        ['state:idle', (n) => textIncludes(n, 'state:idle')],
        [`slide ${page} fills the stage`, () =>
          !!stage && !!slide && Math.abs(slide.left - stage.left) <= 2 && Math.abs(slide.top - stage.top) <= 2],
      ])
    }
    const pagerTap = (id: string) => tapFresh(config, id, { id, clickable: true })
    await expect('pager-initial-page', (nodes) => pagerSettled(nodes, 1), 'one-ui-pager-root')
    pagerTap('one-ui-pager-page-3')
    await expect('pager-set-page', (nodes) => pagerSettled(nodes, 3))
    pagerTap('one-ui-pager-instant-2')
    await expect('pager-set-page-without-animation', (nodes) => pagerSettled(nodes, 2))
    swipeOnNode(config, 'Pager drag forward', { id: 'one-ui-pager-stage' }, 0.8, 0.2)
    await expect('pager-drag-forward', (nodes) => pagerSettled(nodes, 3))
    swipeOnNode(config, 'Pager drag back', { id: 'one-ui-pager-stage' }, 0.2, 0.8)
    await expect('pager-drag-back', (nodes) => pagerSettled(nodes, 2))
    pagerTap('one-ui-pager-scroll')
    swipeOnNode(config, 'Pager drag while disabled', { id: 'one-ui-pager-stage' }, 0.8, 0.2)
    await Bun.sleep(1000)
    await expect('pager-drag-disabled', (nodes) => pagerSettled(nodes, 2))
    pagerTap('one-ui-pager-page-0')
    await expect('pager-set-page-while-disabled', (nodes) => pagerSettled(nodes, 0))
    pagerTap('one-ui-pager-scroll')
    pagerTap('one-ui-pager-page-3')
    await expect('pager-last-page', (nodes) => pagerSettled(nodes, 3))
    pagerTap('one-ui-pager-remove-last')
    await expect('pager-remove-selected-last', (nodes) =>
      pagerSettled(nodes, 2) && matching(nodes, { id: 'one-ui-pager-slide-3' }).length === 0)
  }

  try {
    preflight(config)
    requireMetroReverse(config)
    stampDebugHost(config)
    relaunchApp(config)

    await expect(
      'app-mounted',
      (nodes) =>
        exactlyOneId(nodes, 'home-screen') &&
        textIncludes(nodes, 'One Native Test Suite'),
      'home-screen'
    )
    if (config.suite === 'portal' || config.suite === 'pager' || config.suite === 'system' || config.suite === 'system-app-icon' || config.suite === 'system-share' || config.suite === 'system-location') {
      await (config.suite === 'portal' ? portal() : config.suite === 'pager' ? pager() : config.suite === 'system-app-icon' ? appIcon() : config.suite === 'system-share' ? share() : config.suite === 'system-location' ? location() : system())
      console.log(`PASS one-native-android ${config.suite} ${checks.length} checks`)
      return
    }
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
        return (
          policy.length === 1 &&
          status.length === 1 &&
          status[0].text === 'Policy: accept'
        )
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
    const iconButton = nodeById(
      iconButtonSnapshot.nodes,
      'one-native-android-icon-button'
    )
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
            [
              'switch kept',
              (n) => textIncludes(n, 'Switch: on · Request: on · Revision: 1'),
            ],
            ['prop kept', (n) => textIncludes(n, 'Prop: expanded')],
            [
              'window is landscape',
              () => window.right - window.left > window.bottom - window.top,
            ],
            ['row widened', () => width > portraitRowWidth * 1.2],
            // the short edge clips a device-specific row count, so exact-once
            // over a fixed visible list fails on viewports whose fold sits
            // higher. assert true duplicates over the full list instead, the
            // same shape the inputs screen already uses.
            ['no landscape duplicates', (n) => hasDuplicates(n, proofIds).length === 0],
          ])
        },
        'one-native-android-mounted',
        (nodes) => ({
          portraitRowWidth,
          landscapeRowWidth: nodeWidth(nodeById(nodes, 'one-native-android-button-row')),
          window: applicationBounds(nodes),
          duplicates: hasDuplicates(nodes, proofIds),
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
            ['no landscape duplicates', (n) => hasDuplicates(n, proofIds).length === 0],
          ]),
        'one-native-android-mounted',
        (nodes) => ({ duplicates: hasDuplicates(nodes, proofIds) })
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
          [
            'switch kept',
            (n) => textIncludes(n, 'Switch: on · Request: on · Revision: 1'),
          ],
          ['optional kept', (n) => textIncludes(n, 'Optional: mounted')],
          ['prop kept', (n) => textIncludes(n, 'Prop: expanded')],
          ['row width reverted', () => ratio > 0.9 && ratio < 1.1],
          ['no duplicates', (n) => duplicateIds(n).length === 0],
        ])
      },
      'one-native-android-mounted',
      (nodes) => ({
        portraitRowWidth,
        revertedRowWidth: nodeWidth(nodeById(nodes, 'one-native-android-button-row')),
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
    if (!exactlyOneId(snapshot(config).nodes, 'one-native-android-inputs-mounted')) {
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
            [
              'inputs marker',
              (n) => exactlyOneId(n, 'one-native-android-inputs-mounted'),
            ],
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
          matching(nodes, { id: 'one-native-android-inputs-slider-status' })[0]?.text ??
          ''
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
          [
            'custom body id',
            (n) => exactlyOneId(n, 'one-native-android-inputs-custom-body'),
          ],
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
          [
            'linear indicator',
            (n) => exactlyOneId(n, 'one-native-android-inputs-progress-linear'),
          ],
          [
            'circular indicator',
            (n) => exactlyOneId(n, 'one-native-android-inputs-progress-circular'),
          ],
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
      const label = nodes.flatMap(nodeValues).find((value) => value.startsWith(prefix))
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
    // keyboard is capped by the stable inset. the leg forces the soft
    // keyboard on for itself only: forcing it suite-wide breaks the inputs
    // textfield legs, whose typed text stops reaching the field. the leg
    // fails unless the keyboard actually raised.
    adbText(config, [
      'shell',
      'settings',
      'put',
      'secure',
      'show_ime_with_hard_keyboard',
      '1',
    ])
    const beforeIme = safeAreaNumbers(snapshot(config).nodes, 'Insets: ')
    tapFresh(config, 'Safe-area input focus', { id: 'one-native-safe-area-input' })
    adbType(config, 'ada')
    requireKeyboardShown(config)
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

    // the ime probe leaves the keyboard over the edges toggle; it is proven
    // up, so one back press can only dismiss it, never leave the screen.
    pressBack(config)
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
    // restore the emulator default so later legs run unmodified.
    adbText(config, [
      'shell',
      'settings',
      'delete',
      'secure',
      'show_ime_with_hard_keyboard',
    ])

    // haptics on Android: presence (the native module resolved), tap-through
    // of every verb with the Last label proving each call returned, and an
    // Error: none sweep proving no js throw escaped. redbox detection rides
    // in waitFor via assertNoRedBox on every snapshot.
    pressBack(config)
    await tapNavigation(config, 'nav-one-native-haptics')
    await expect(
      'haptics-module-present',
      (nodes) =>
        diagnose(nodes, [
          ['selection control', (n) => exactlyOneId(n, 'one-native-haptics-selection')],
          ['module marker', (n) => textIncludes(n, 'Module: available')],
        ]),
      'one-native-haptics-selection'
    )
    const hapticsVerbs = [
      'selection',
      'impact-light',
      'impact-medium',
      'impact-heavy',
      'impact-soft',
      'impact-rigid',
      'notification-success',
      'notification-warning',
      'notification-error',
    ]
    for (const verb of hapticsVerbs) {
      tapFresh(config, `Haptics ${verb}`, {
        id: `one-native-haptics-${verb}`,
        role: 'button',
        clickable: true,
      })
      await expect(
        `haptics-tap-${verb}`,
        (nodes) => textIncludes(nodes, `Last: ${verb}`),
        `one-native-haptics-${verb}`
      )
    }
    await expect(
      'haptics-error-clean',
      (nodes) => textIncludes(nodes, 'Error: none'),
      'one-native-haptics-selection'
    )
    // crypto on Android: presence (the native module resolved), two uuids
    // off the device that match rfc 4122 v4 and differ, a 16-byte
    // getRandomValues fill, regeneration keeping all of it valid, and an
    // Error: none sweep proving no js throw escaped. redbox detection
    // rides in waitFor via assertNoRedBox on every snapshot.
    pressBack(config)
    await tapNavigation(config, 'nav-one-native-crypto')
    const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
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
          ['regenerate control', (n) => exactlyOneId(n, 'one-native-crypto-regenerate')],
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
    // app info on Android: the exact stamped fixture-manifest values reach
    // runtime through the native constants module, not template defaults.
    // redbox detection rides in waitFor via assertNoRedBox on every snapshot.
    pressBack(config)
    await tapNavigation(config, 'nav-one-native-app-info')
    await expect(
      'app-info-stamped-values',
      (nodes) =>
        diagnose(nodes, [
          ['refresh control', (n) => exactlyOneId(n, 'one-native-app-info-refresh')],
          ['version marker', (n) => textIncludes(n, 'Version: 9.9.9')],
          ['build marker', (n) => textIncludes(n, 'Build: 4242')],
          [
            'application id marker',
            (n) => textIncludes(n, 'ApplicationId: dev.vxrn.nativefeatures.tests'),
          ],
        ]),
      'one-native-app-info-refresh'
    )
    tapFresh(config, 'App info refresh tap', {
      id: 'one-native-app-info-refresh',
      role: 'button',
      clickable: true,
    })
    await expect(
      'app-info-tap',
      (nodes) => textIncludes(nodes, 'Taps: 1'),
      'one-native-app-info-refresh'
    )

    // apple auth on Android answers the way the web entry does: isAvailable is
    // false and both requests reject, without a code, as needing an iOS build.
    pressBack(config)
    await expect(
      'apple-auth-navigate-home',
      (nodes) =>
        diagnose(nodes, [
          ['home-screen marker', (n) => exactlyOneId(n, 'home-screen')],
          ['nav list row', (n) => n.some((node) => node.resourceId.includes('nav-'))],
        ]),
      'home-screen'
    )
    await tapNavigation(config, 'nav-one-native-apple-auth')
    await expect(
      'apple-auth-explicit-absence',
      (nodes) =>
        diagnose(nodes, [['availability false', (n) => textIncludes(n, 'Available: false')]]),
      'one-native-apple-auth-available'
    )
    tapFresh(config, 'Apple auth signin tap', {
      id: 'one-native-apple-auth-signin',
      role: 'button',
      clickable: true,
    })
    await expect(
      'apple-auth-signin-rejected',
      (nodes) =>
        textIncludes(
          nodes,
          'SignIn: error: Auth.Apple.signIn needs an iOS build'
        ),
      'one-native-apple-auth-signin-result'
    )
    tapFresh(config, 'Apple auth credential tap', {
      id: 'one-native-apple-auth-credential',
      role: 'button',
      clickable: true,
    })
    await expect(
      'apple-auth-credential-rejected',
      (nodes) =>
        textIncludes(
          nodes,
          'CredentialState: error: Auth.Apple.getCredentialState needs an iOS build'
        ),
      'one-native-apple-auth-credential-state'
    )

    // browser on Android: warmup and mayLaunchUrl exercise Custom Tabs service
    pressBack(config)
    await expect(
      'browser-navigate-home',
      (nodes) =>
        diagnose(nodes, [
          ['home-screen marker', (n) => exactlyOneId(n, 'home-screen')],
          ['nav list row', (n) => n.some((node) => node.resourceId.includes('nav-'))],
        ]),
      'home-screen'
    )
    await tapNavigation(config, 'nav-one-native-browser')
    await expect(
      'browser-mounted',
      (nodes) => textIncludes(nodes, 'Result: none'),
      'one-native-browser-open'
    )
    tapFresh(config, 'Browser warmup tap', {
      id: 'one-native-browser-warmup',
      role: 'button',
      clickable: true,
    })
    await expect(
      'browser-warmup-result',
      // the boolean is chrome's own answer; the check is that the call settles,
      // which it did not when no custom tabs client bound
      (nodes) => textIncludes(nodes, 'Warmup: true') || textIncludes(nodes, 'Warmup: false'),
      'one-native-browser-warmup'
    )
    tapFresh(config, 'Browser may launch tap', {
      id: 'one-native-browser-may-launch',
      role: 'button',
      clickable: true,
    })
    await expect(
      'browser-may-launch-result',
      (nodes) =>
        textIncludes(nodes, 'MayLaunchUrl: true') || textIncludes(nodes, 'MayLaunchUrl: false'),
      'one-native-browser-may-launch'
    )

    // the auth tab follows a real redirect to the app's scheme and settles the
    // session with that url. the emulator reaches the host's redirect server
    // through adb reverse.
    adbText(config, ['reverse', 'tcp:8123', 'tcp:8123'])
    const redirectServer = Bun.serve({
      port: 8123,
      fetch: () => Response.redirect('nativefeatures://auth?code=android1', 302),
    })
    try {
      tapFresh(config, 'Browser auth redirect tap', {
        id: 'one-native-browser-auth-redirect',
        role: 'button',
        clickable: true,
      })
      await expect(
        'browser-auth-redirect',
        (nodes) => textIncludes(nodes, 'Auth: success nativefeatures://auth?code=android1'),
        'one-native-browser-auth-redirect'
      )
    } finally {
      redirectServer.stop()
      adbText(config, ['reverse', '--remove', 'tcp:8123'])
    }

    // the system picker (or the documents fallback on devices without it)
    // opens outside our tree, so back dismisses it and the canceled result
    // must round-trip through the bridge. the camera leg stays manual: the
    // runtime permission dialog and the camera app are outside this
    // harness's contract.
    pressBack(config)
    await expect(
      'image-picker-navigate-home',
      (nodes) =>
        diagnose(nodes, [
          ['home-screen marker', (n) => exactlyOneId(n, 'home-screen')],
          ['nav list row', (n) => n.some((node) => node.resourceId.includes('nav-'))],
        ]),
      'home-screen'
    )
    await tapNavigation(config, 'nav-one-native-image-picker')
    await expect(
      'image-picker-mounted',
      (nodes) =>
        diagnose(nodes, [
          ['library button', (n) => exactlyOneId(n, 'one-native-image-picker-library')],
          ['idle result', (n) => textIncludes(n, 'Result: idle')],
        ]),
      'one-native-image-picker-library'
    )
    // precondition: the camera permission must be undecided on this
    // device. reinstall or clear the app when a manual prompt probe
    // tainted it.
    tapFresh(config, 'Image picker permissions button', {
      id: 'one-native-image-picker-permissions',
      role: 'button',
      clickable: true,
    })
    await expect(
      'image-picker-permissions',
      (nodes) =>
        diagnose(nodes, [
          ['undecided status', (n) => textIncludes(n, 'PermStatus: undetermined')],
          ['not granted', (n) => textIncludes(n, 'PermGranted: false')],
          ['askable', (n) => textIncludes(n, 'PermCanAsk: true')],
        ]),
      'one-native-image-picker-permissions'
    )
    clearDocumentsUi(config)
    tapFresh(config, 'Image picker library button', {
      id: 'one-native-image-picker-library',
      role: 'button',
      clickable: true,
    })
    await waitFor(
      config,
      'system picker foregrounds',
      (nodes) => !exactlyOneId(nodes, 'one-native-image-picker-library')
    )
    pressBack(config)
    await expect(
      'image-picker-cancel',
      (nodes) =>
        diagnose(nodes, [
          ['cancel reported', (n) => textIncludes(n, 'Result: canceled')],
          [
            'library button back',
            (n) => exactlyOneId(n, 'one-native-image-picker-library'),
          ],
        ]),
      'one-native-image-picker-library'
    )

    // speech: clear app data so the microphone permission starts
    // undetermined, prove a session without it fails not-allowed, then grant
    // and run full sessions. the runtime dialog is outside this harness's
    // contract, so pm grant stands in for it and request reads it back.
    clearAppData(config)
    await expect(
      'speech-home',
      (nodes) => exactlyOneId(nodes, 'home-screen'),
      'home-screen'
    )
    await tapNavigation(config, 'nav-one-native-speech')
    const speechLog = (nodes: Node[], name: string) =>
      nodes
        .flatMap((node) => [node.text, node.contentDescription])
        .find((text) => text?.startsWith(`${name}: `))
        ?.slice(name.length + 2) ?? null
    const speechEnded = (nodes: Node[], name: string) =>
      /(^|,)end$/.test(speechLog(nodes, name) ?? '')
    const tapSpeech = (id: string) =>
      tapFresh(config, id, { id, role: 'button', clickable: true })
    await expect(
      'speech-mounted-undetermined',
      (nodes) =>
        diagnose(nodes, [
          ['recognizer available', (n) => textIncludes(n, 'Available: true')],
          ['undetermined', (n) => textIncludes(n, 'Permission: undetermined')],
        ]),
      'one-native-speech-start'
    )
    tapSpeech('one-native-speech-start')
    await expect(
      'speech-without-permission-fails',
      (nodes) => speechLog(nodes, 'A') === 'error:not-allowed',
      'one-native-speech-start'
    )
    adbText(config, [
      'shell',
      'pm',
      'grant',
      config.packageId,
      'android.permission.RECORD_AUDIO',
    ])
    tapSpeech('one-native-speech-request')
    await expect(
      'speech-permission-granted',
      (nodes) => textIncludes(nodes, 'Permission: granted'),
      'one-native-speech-request'
    )
    tapSpeech('one-native-speech-start')
    await expect(
      'speech-session-opens',
      (nodes) => speechLog(nodes, 'A')?.startsWith('start') === true,
      'one-native-speech-start'
    )
    tapSpeech('one-native-speech-stop')
    await expect(
      'speech-stop-ends',
      (nodes) => speechEnded(nodes, 'A'),
      'one-native-speech-stop'
    )
    tapSpeech('one-native-speech-start')
    await expect(
      'speech-session-a-opens',
      (nodes) => speechLog(nodes, 'A') === 'start',
      'one-native-speech-start'
    )
    tapSpeech('one-native-speech-replace')
    await expect(
      'speech-session-b-opens',
      (nodes) => speechLog(nodes, 'B')?.startsWith('start') === true,
      'one-native-speech-replace'
    )
    tapSpeech('one-native-speech-stop')
    await expect(
      'speech-replaced-a-stays-silent',
      (nodes) => speechEnded(nodes, 'B') && speechLog(nodes, 'A') === 'start',
      'one-native-speech-stop'
    )
    tapSpeech('one-native-speech-start')
    await expect(
      'speech-session-a-reopens',
      (nodes) => speechLog(nodes, 'A') === 'start',
      'one-native-speech-start'
    )
    tapSpeech('one-native-speech-abort')
    tapSpeech('one-native-speech-replace')
    await expect(
      'speech-b-opens-after-abort',
      (nodes) => speechLog(nodes, 'B')?.startsWith('start') === true,
      'one-native-speech-replace'
    )
    tapSpeech('one-native-speech-stop')
    await expect(
      'speech-aborted-a-stays-silent',
      (nodes) => speechEnded(nodes, 'B') && speechLog(nodes, 'A') === 'start',
      'one-native-speech-stop'
    )

    // fetch: every behavior the global fetch keeps from react native's
    // fetch, plus the streamed body it adds. the stream label is the negative
    // control: a buffered fetch delivers the first chunk only at the end.
    relaunchApp(config)
    await expect('fetch-home', (nodes) => exactlyOneId(nodes, 'home-screen'), 'home-screen')
    await tapNavigation(config, 'nav-one-native-fetch')
    await expect(
      'fetch-mounted',
      (nodes) => textIncludes(nodes, 'Status: idle'),
      'one-native-fetch-run'
    )
    tapFresh(config, 'one-native-fetch-run', {
      id: 'one-native-fetch-run',
      role: 'button',
      clickable: true,
    })
    const fetched = await expect(
      'fetch-checks-report',
      (nodes) => textIncludes(nodes, 'Status: done') || textIncludes(nodes, 'Status: failed'),
      'one-native-fetch-run'
    )
    const fetchLabels = fetched.nodes.flatMap((node) => nodeValues(node))
    const fetchFailure = fetchLabels.find((label) => label.startsWith('Status: failed'))
    if (fetchFailure) throw new Error(fetchFailure)
    const fetchExpected: [string, string][] = [
      ["Stream", "1|2|3 early=true"],
      ["Echo", "200 yes POST application/json yes a=1"],
      ["Bytes", "PUT 000102ff"],
      ["Blob", "4 application/octet-stream 000102ff"],
      ["Form", "multipart/form-data true true"],
      ["RequestForm", "multipart/form-data true true"],
      ["RequestBlob", "application/octet-stream 000102ff 4"],
      ["Redirect", "200 true true"],
      ["Cookie", "one_fetch=1 null"],
      ["NoContent", "204 null"],
      ["Clone", "true true"],
      ["Identity", "true false"],
      ["UriForm", "multipart/form-data true true"],
      ["UriMissing", "type error"],
      ["Abort", "first AbortError"],
      ["AbortBefore", "AbortError"],
      ["Refused", "type error"],
    ]
    for (const [name, value] of fetchExpected) {
      if (!fetchLabels.includes(`${name}: ${value}`))
        throw new Error(
          `fetch ${name}: expected ${JSON.stringify(value)}, got ${JSON.stringify(fetchLabels.find((label) => label.startsWith(`${name}: `)))}`
        )
      console.log(`PASS fetch-${name.toLowerCase()}`)
    }

    // secure store: async and sync verbs read each other's writes, a missing
    // key reads null, and a value written before a cold relaunch reads back on
    // mount. the clear before the run makes the relaunch read the negative
    // control: it can only say kept if the store survived the process.
    relaunchApp(config)
    await expect('secure-store-home', (nodes) => exactlyOneId(nodes, 'home-screen'), 'home-screen')
    await tapNavigation(config, 'nav-one-native-secure-store')
    await expect(
      'secure-store-mounted',
      (nodes) => textIncludes(nodes, 'Status: idle'),
      'one-native-secure-store-run'
    )
    tapFresh(config, 'one-native-secure-store-clear', {
      id: 'one-native-secure-store-clear',
      role: 'button',
      clickable: true,
    })
    await expect(
      'secure-store-cleared',
      (nodes) => textIncludes(nodes, 'Status: cleared'),
      'one-native-secure-store-run'
    )
    tapFresh(config, 'one-native-secure-store-run', {
      id: 'one-native-secure-store-run',
      role: 'button',
      clickable: true,
    })
    const stored = await expect(
      'secure-store-checks-report',
      (nodes) => textIncludes(nodes, 'Status: done') || textIncludes(nodes, 'Status: failed'),
      'one-native-secure-store-run'
    )
    const storeLabels = stored.nodes.flatMap((node) => nodeValues(node))
    const storeFailure = storeLabels.find((label) => label.startsWith('Status: failed'))
    if (storeFailure) throw new Error(storeFailure)
    const storeExpected: [string, string][] = [
      ['AsyncMissing', 'null'],
      ['Async', 'a2'],
      ['AsyncDeleted', 'null'],
      ['SyncMissing', 'null'],
      ['Sync', 's2'],
      ['SyncToAsync', 's2'],
      ['AsyncToSync', 'from async'],
      ['SyncDeleted', 'null'],
      ['EmptyKey', 'Error'],
    ]
    for (const [name, value] of storeExpected) {
      if (!storeLabels.includes(`${name}: ${value}`))
        throw new Error(
          `secure-store ${name}: expected ${JSON.stringify(value)}, got ${JSON.stringify(storeLabels.find((label) => label.startsWith(`${name}: `)))}`
        )
      console.log(`PASS secure-store-${name.toLowerCase()}`)
    }
    relaunchApp(config)
    await expect('secure-store-relaunch-home', (nodes) => exactlyOneId(nodes, 'home-screen'), 'home-screen')
    await tapNavigation(config, 'nav-one-native-secure-store')
    await expect(
      'secure-store-persisted',
      (nodes) => textIncludes(nodes, 'Persisted: kept'),
      'one-native-secure-store-run'
    )
    tapFresh(config, 'one-native-secure-store-clear', {
      id: 'one-native-secure-store-clear',
      role: 'button',
      clickable: true,
    })
    await expect(
      'secure-store-cleared-after-relaunch',
      (nodes) => textIncludes(nodes, 'Status: cleared'),
      'one-native-secure-store-run'
    )

    // storage: the same checks as ios, then a cold relaunch must read the
    // value written before it, and after a clear and another relaunch it must
    // read null, so the persisted read cannot pass on stale memory.
    relaunchApp(config)
    await expect('storage-home', (nodes) => exactlyOneId(nodes, 'home-screen'), 'home-screen')
    await tapNavigation(config, 'nav-one-native-storage')
    await expect('storage-mounted', (nodes) => textIncludes(nodes, 'Status: idle'), 'one-native-storage-run')
    tapFresh(config, 'one-native-storage-clear', { id: 'one-native-storage-clear', role: 'button', clickable: true })
    await expect('storage-cleared', (nodes) => textIncludes(nodes, 'Status: cleared'), 'one-native-storage-run')
    tapFresh(config, 'one-native-storage-run', { id: 'one-native-storage-run', role: 'button', clickable: true })
    const storageReport = await expect(
      'storage-checks-report',
      (nodes) => textIncludes(nodes, 'Status: done') || textIncludes(nodes, 'Status: failed'),
      'one-native-storage-run'
    )
    const storageLabels = storageReport.nodes.flatMap((node) => nodeValues(node))
    const storageFailure = storageLabels.find((label) => label.startsWith('Status: failed'))
    if (storageFailure) throw new Error(storageFailure)
    const storageExpected: [string, string][] = [
      ['Missing', 'null'],
      ['Overwritten', 'second'],
      ['EmptyValue', '""'],
      ['AllKeys', 'other,value'],
      ['AfterRemove', 'null'],
      ['RemoveMissing', 'null'],
      ['AllKeysEmpty', '[]'],
      ['EmptyKey', 'Storage.getItem: key must be a non-empty string'],
      ['NonStringKey', 'Storage.getItem: key must be a non-empty string'],
      ['NonStringValue', 'Storage.setItem: value must be a string'],
    ]
    for (const [name, value] of storageExpected) {
      if (!storageLabels.includes(`${name}: ${value}`))
        throw new Error(
          `storage ${name}: expected ${JSON.stringify(value)}, got ${JSON.stringify(storageLabels.find((label) => label.startsWith(`${name}: `)))}`
        )
      console.log(`PASS storage-${name.toLowerCase()}`)
    }
    relaunchApp(config)
    await expect('storage-relaunch-home', (nodes) => exactlyOneId(nodes, 'home-screen'), 'home-screen')
    await tapNavigation(config, 'nav-one-native-storage')
    await expect('storage-persisted', (nodes) => textIncludes(nodes, 'Persisted: kept'), 'one-native-storage-run')
    console.log('PASS storage-persist')
    tapFresh(config, 'one-native-storage-clear', { id: 'one-native-storage-clear', role: 'button', clickable: true })
    await expect('storage-cleared-after-relaunch', (nodes) => textIncludes(nodes, 'Status: cleared'), 'one-native-storage-run')
    relaunchApp(config)
    await expect('storage-removed-home', (nodes) => exactlyOneId(nodes, 'home-screen'), 'home-screen')
    await tapNavigation(config, 'nav-one-native-storage')
    await expect('storage-removed', (nodes) => textIncludes(nodes, 'Persisted: null'), 'one-native-storage-run')
    console.log('PASS storage-deleted-persist')

    // notifications slice n1: clear app data so the permission starts
    // undetermined like a fresh install, then grant and read back.
    clearAppData(config)
    await expect(
      'notifications-home',
      (nodes) =>
        diagnose(nodes, [
          ['home-screen marker', (n) => exactlyOneId(n, 'home-screen')],
          ['nav list row', (n) => n.some((node) => node.resourceId.includes('nav-'))],
        ]),
      'home-screen'
    )
    await tapNavigation(config, 'nav-one-native-notifications')
    await expect(
      'notifications-mounted',
      (nodes) => textIncludes(nodes, 'Notifications: mounted'),
      'one-native-notifications-permission-refresh'
    )
    // the fixture scrolls; bring each button into the viewport like
    // tapNavigation does before tapping its center.
    const tapNotif = (name: string, testID: string) => {
      for (let attempt = 0; attempt < 8; attempt++) {
        const current = snapshot(config)
        const rows = matching(current.nodes, { id: testID })
        const viewport = applicationBounds(current.nodes)
        const bounds = rows.length === 1 ? rows[0].bounds : undefined
        const x = bounds ? Math.round((bounds.left + bounds.right) / 2) : 0
        const y = bounds ? Math.round((bounds.top + bounds.bottom) / 2) : 0
        if (
          bounds &&
          x > viewport.left &&
          x < viewport.right &&
          y > viewport.top &&
          y < viewport.bottom
        ) {
          adbText(config, ['shell', 'input', 'tap', String(x), String(y)])
          return
        }
        swipeFresh(config, name)
      }
      throw new Error(`Could not bring ${testID} into view on the fixture`)
    }
    tapNotif(
      'Notifications permission refresh',
      'one-native-notifications-permission-refresh'
    )
    await expect(
      'notifications-permission-undetermined',
      (nodes) => textIncludes(nodes, 'Permission: undetermined'),
      'one-native-notifications-permission-refresh'
    )
    adbText(config, [
      'shell',
      'pm',
      'grant',
      config.packageId,
      'android.permission.POST_NOTIFICATIONS',
    ])
    tapNotif(
      'Notifications permission refresh granted',
      'one-native-notifications-permission-refresh'
    )
    await expect(
      'notifications-permission-granted',
      (nodes) => textIncludes(nodes, 'Permission: granted'),
      'one-native-notifications-permission-refresh'
    )
    tapNotif('Notifications badge set', 'one-native-notifications-badge-set')
    await expect(
      'notifications-badge-set-resolves-false',
      (nodes) => textIncludes(nodes, 'Badge: set:no'),
      'one-native-notifications-badge-set'
    )
    tapNotif('Notifications badge get', 'one-native-notifications-badge-get')
    await expect(
      'notifications-badge-is-zero',
      (nodes) => textIncludes(nodes, 'Badge: 0'),
      'one-native-notifications-badge-get'
    )
    // slice n2: create, read back, list, delete.
    tapNotif('Notifications channel create', 'one-native-notifications-channel-create')
    await expect(
      'notifications-channel-created',
      (nodes) => textIncludes(nodes, 'Channel: Test Channel/default'),
      'one-native-notifications-channel-create'
    )
    tapNotif('Notifications channel get', 'one-native-notifications-channel-get')
    await expect(
      'notifications-channel-read-back',
      (nodes) => textIncludes(nodes, 'Channel: Test Channel/default'),
      'one-native-notifications-channel-get'
    )
    tapNotif('Notifications channel list', 'one-native-notifications-channel-list')
    await expect(
      'notifications-channel-listed',
      (nodes) => textIncludes(nodes, 'Channels: 1'),
      'one-native-notifications-channel-list'
    )
    tapNotif('Notifications channel delete', 'one-native-notifications-channel-delete')
    await expect(
      'notifications-channel-deleted',
      (nodes) => textIncludes(nodes, 'Channel: deleted'),
      'one-native-notifications-channel-delete'
    )
    tapNotif(
      'Notifications channel get after delete',
      'one-native-notifications-channel-get'
    )
    await expect(
      'notifications-channel-gone',
      (nodes) => textIncludes(nodes, 'Channel: null'),
      'one-native-notifications-channel-get'
    )
    // the fixture app sets no push flag, so the nopush source set compiled:
    // the token fetch rejects instead of reaching firebase.
    tapNotif('Notifications push token', 'one-native-notifications-push-token')
    await expect(
      'notifications-push-disabled-rejects',
      (nodes) => textIncludes(nodes, 'Push: error'),
      'one-native-notifications-push-token'
    )
    // slice n3: with no listeners mounted, native presents the arrival
    // itself instead of waiting out the 3s backstop.
    tapNotif(
      'Notifications schedule unobserved',
      'one-native-notifications-schedule-unobserved'
    )
    await expect(
      'notifications-unobserved-presented',
      (nodes) => textIncludes(nodes, 'Unobserved: presented in '),
      'one-native-notifications-schedule-unobserved'
    )
    tapNotif('Notifications subscribe', 'one-native-notifications-subscribe')
    await expect(
      'notifications-subscribed',
      (nodes) => textIncludes(nodes, 'Subscribed: yes'),
      'one-native-notifications-subscribe'
    )
    // no handler was set yet, so the first observed arrival shows by
    // default. background the app, tap the banner in the shade, and the
    // response lands back in the fixture.
    tapNotif('Notifications schedule now', 'one-native-notifications-schedule-now')
    await expect(
      'notifications-received-default',
      (nodes) => textIncludes(nodes, 'Received: n3-1'),
      'one-native-notifications-schedule-now'
    )
    const tapShade = (name: string, text: string) => {
      adbText(config, ['shell', 'input', 'keyevent', '3'])
      expandNotificationShade(config)
      const current = snapshot(config)
      const target = current.nodes.find(
        (node) => node.text === text || node.contentDescription === text
      )
      if (!target) throw new Error(`${name}: no shade node with text ${text}.`)
      const bounds = validBounds(clickableTarget(current.nodes, target) ?? target, name)
      const x = Math.round((bounds.left + bounds.right) / 2)
      const y = Math.round((bounds.top + bounds.bottom) / 2)
      adbText(config, ['shell', 'input', 'tap', String(x), String(y)])
    }
    const foregroundApp = () => {
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
      adbText(config, ['shell', 'am', 'start', '-W', '-n', launcherComponent])
    }
    tapShade('Notifications warm tap', 'N3 ping')
    await expect(
      'notifications-response-warm',
      (nodes) => textIncludes(nodes, 'Response: n3-1/'),
      'one-native-notifications-schedule-now'
    )
    tapNotif('Notifications last refresh', 'one-native-notifications-last-refresh')
    await expect(
      'notifications-last-warm',
      (nodes) => textIncludes(nodes, 'Last: n3-1/N3 ping'),
      'one-native-notifications-last-refresh'
    )
    // a suppressing handler still fires received but posts nothing: the
    // expanded shade holds no banner. the tapped n3-1 auto-cancelled, so
    // any N3 ping in the shade is a failure.
    tapNotif(
      'Notifications handler suppress',
      'one-native-notifications-handler-suppress'
    )
    await expect(
      'notifications-handler-suppress',
      (nodes) => textIncludes(nodes, 'Handler: suppress'),
      'one-native-notifications-handler-suppress'
    )
    tapNotif('Notifications schedule suppressed', 'one-native-notifications-schedule-now')
    await expect(
      'notifications-received-suppressed',
      (nodes) => textIncludes(nodes, 'Received: n3-2'),
      'one-native-notifications-schedule-now'
    )
    adbText(config, ['shell', 'input', 'keyevent', '3'])
    expandNotificationShade(config)
    if (textIncludes(snapshot(config).nodes, 'N3 ping'))
      throw new Error('a suppressed notification reached the shade')
    adbText(config, ['shell', 'cmd', 'statusbar', 'collapse'])
    foregroundApp()
    await expect(
      'notifications-foregrounded-after-suppress',
      (nodes) => textIncludes(nodes, 'Received: n3-2'),
      'one-native-notifications-schedule-now'
    )
    // a nulled handler behaves the same way.
    tapNotif('Notifications handler null', 'one-native-notifications-handler-null')
    await expect(
      'notifications-handler-null',
      (nodes) => textIncludes(nodes, 'Handler: null'),
      'one-native-notifications-handler-null'
    )
    tapNotif('Notifications schedule nulled', 'one-native-notifications-schedule-now')
    await expect(
      'notifications-received-nulled',
      (nodes) => textIncludes(nodes, 'Received: n3-3'),
      'one-native-notifications-schedule-now'
    )
    adbText(config, ['shell', 'input', 'keyevent', '3'])
    expandNotificationShade(config)
    if (textIncludes(snapshot(config).nodes, 'N3 ping'))
      throw new Error('a nulled handler reached the shade')
    adbText(config, ['shell', 'cmd', 'statusbar', 'collapse'])
    foregroundApp()
    await expect(
      'notifications-foregrounded-after-null',
      (nodes) => textIncludes(nodes, 'Received: n3-3'),
      'one-native-notifications-schedule-now'
    )
    // slice n4: clear leftovers, schedule two, cancel one, observe the other.
    tapNotif('Notifications cancel all', 'one-native-notifications-cancel-all')
    await expect(
      'notifications-cancel-all',
      (nodes) => textIncludes(nodes, 'Pending: cancelled'),
      'one-native-notifications-cancel-all'
    )
    tapNotif('Notifications dismiss all', 'one-native-notifications-dismiss-all')
    await expect(
      'notifications-dismiss-all',
      (nodes) => textIncludes(nodes, 'Presented: dismissed'),
      'one-native-notifications-dismiss-all'
    )
    tapNotif(
      'Notifications schedule interval',
      'one-native-notifications-schedule-interval'
    )
    await expect(
      'notifications-interval-scheduled',
      (nodes) => textIncludes(nodes, 'Scheduled: n4-interval'),
      'one-native-notifications-schedule-interval'
    )
    tapNotif('Notifications schedule date', 'one-native-notifications-schedule-date')
    await expect(
      'notifications-date-scheduled',
      (nodes) => textIncludes(nodes, 'Scheduled: n4-date'),
      'one-native-notifications-schedule-date'
    )
    tapNotif('Notifications scheduled list', 'one-native-notifications-scheduled-list')
    await expect(
      'notifications-both-pending',
      (nodes) => textIncludes(nodes, 'Pending: n4-date,n4-interval'),
      'one-native-notifications-scheduled-list'
    )
    tapNotif('Notifications cancel interval', 'one-native-notifications-cancel-interval')
    await expect(
      'notifications-interval-cancelled',
      (nodes) => textIncludes(nodes, 'Pending: cancelled'),
      'one-native-notifications-cancel-interval'
    )
    tapNotif(
      'Notifications scheduled list again',
      'one-native-notifications-scheduled-list'
    )
    await expect(
      'notifications-cancel-removes-pending',
      (nodes) => textIncludes(nodes, 'Pending: n4-date'),
      'one-native-notifications-scheduled-list'
    )
    // the date trigger fires 25s after scheduling; the pending-list reads
    // above already spent part of that, so this check gets its own budget.
    await expect(
      'notifications-date-received',
      (nodes) => textIncludes(nodes, 'Received: n4-date'),
      'one-native-notifications-schedule-now',
      undefined,
      45_000
    )
    tapNotif('Notifications presented list', 'one-native-notifications-presented-list')
    await expect(
      'notifications-date-presented',
      (nodes) => textIncludes(nodes, 'Presented: n4-date'),
      'one-native-notifications-presented-list'
    )
    tapNotif('Notifications dismiss date', 'one-native-notifications-dismiss-date')
    await expect(
      'notifications-dismiss-resolves',
      (nodes) => textIncludes(nodes, 'Presented: dismissed'),
      'one-native-notifications-dismiss-date'
    )
    tapNotif(
      'Notifications presented list again',
      'one-native-notifications-presented-list'
    )
    await expect(
      'notifications-dismiss-removes-presented',
      (nodes) => textIncludes(nodes, 'Presented: none'),
      'one-native-notifications-presented-list'
    )
    // cold start through a dead process: schedule, background, kill (never
    // force-stop: it cancels alarms), let the alarm post, tap the shade.
    tapNotif('Notifications schedule cold', 'one-native-notifications-schedule-cold')
    await expect(
      'notifications-cold-scheduled',
      (nodes) => textIncludes(nodes, 'Scheduled: n4-cold'),
      'one-native-notifications-schedule-cold'
    )
    adbText(config, ['shell', 'input', 'keyevent', '3'])
    adbText(config, ['shell', 'am', 'kill', config.packageId])
    await new Promise((resolve) => setTimeout(resolve, 17_000))
    expandNotificationShade(config)
    {
      const current = snapshot(config)
      const target = current.nodes.find(
        (node) => node.text === 'N4 cold' || node.contentDescription === 'N4 cold'
      )
      if (!target)
        throw new Error('Notifications cold tap: no shade node with text N4 cold.')
      const bounds = validBounds(
        clickableTarget(current.nodes, target) ?? target,
        'cold tap'
      )
      const x = Math.round((bounds.left + bounds.right) / 2)
      const y = Math.round((bounds.top + bounds.bottom) / 2)
      adbText(config, ['shell', 'input', 'tap', String(x), String(y)])
    }
    await expect(
      'notifications-cold-home',
      (nodes) =>
        diagnose(nodes, [
          ['home-screen marker', (n) => exactlyOneId(n, 'home-screen')],
          ['nav list row', (n) => n.some((node) => node.resourceId.includes('nav-'))],
        ]),
      'home-screen'
    )
    await tapNavigation(config, 'nav-one-native-notifications')
    await expect(
      'notifications-cold-last-response',
      (nodes) => textIncludes(nodes, 'Last: n4-cold/N4 cold'),
      'one-native-notifications-last-refresh'
    )
    pressBack(config)
    await expect(
      'fonts-navigate-home',
      (nodes) =>
        diagnose(nodes, [
          ['home-screen marker', (n) => exactlyOneId(n, 'home-screen')],
          ['nav list row', (n) => n.some((node) => node.resourceId.includes('nav-'))],
        ]),
      'home-screen'
    )
    await tapNavigation(config, 'nav-one-native-fonts')
    await expect(
      'fonts-proof-mounted',
      (nodes) =>
        diagnose(nodes, [
          ['load button', (n) => exactlyOneId(n, 'one-native-fonts-load')],
          ['starts unloaded', (n) => textIncludes(n, 'Loaded: false')],
          ['dev uri over http', (n) => textIncludes(n, 'Uri: http')],
        ]),
      'one-native-fonts-load'
    )

    // android has no pixel-diff tooling (every expect captures a PNG,
    // but nothing compares them), so the block-glyph proof here is the
    // label flip; the iOS flow carries the pixel gate.
    tapFresh(config, 'Fonts load button', {
      id: 'one-native-fonts-load',
      role: 'button',
      clickable: true,
    })
    await expect(
      'fonts-load-flips-isLoaded',
      (nodes) =>
        diagnose(nodes, [
          ['isLoaded true', (n) => textIncludes(n, 'Loaded: true')],
          ['status loaded', (n) => textIncludes(n, 'Status: loaded')],
          ['hook loaded', (n) => textIncludes(n, 'Hook: loaded')],
        ]),
      'one-native-fonts-load'
    )

    // negative control: the same file under a wrong key. Android registers
    // silently because Typeface exposes no name query, so it resolves and
    // the wrong key reads loaded; the iOS flow asserts a reject instead.
    tapFresh(config, 'Fonts negative button', {
      id: 'one-native-fonts-negative',
      role: 'button',
      clickable: true,
    })
    await expect(
      'fonts-wrong-key-registers-silently',
      (nodes) =>
        diagnose(nodes, [
          ['negative resolved', (n) => textIncludes(n, 'Negative: resolved')],
          ['wrong key reads loaded', (n) => textIncludes(n, 'NegativeLoaded: true')],
        ]),
      'one-native-fonts-negative'
    )

    // One.UI.Map on android (google maps compose). runs against a maps
    // build (GOOGLE_MAPS_API_KEY set at prebuild): marker titles are not in
    // the android accessibility tree the way MapKit publishes them, so this
    // leg proves mount, the camera and marker prop path, and the tap and
    // gesture events through the fixture status labels. marker rendering
    // itself is the ios ui-map suite's pixel gate.
    pressBack(config)
    await tapNavigation(config, 'nav-one-native-ui-map')
    const uiMapLabel = (nodes: Node[], id: string) =>
      matching(nodes, { id: `one-native-ui-map-${id}` })[0]?.text ?? ''
    await expect(
      'ui-map-mounted',
      (nodes) =>
        diagnose(nodes, [
          ['screen mounted', (n) => exactlyOneId(n, 'one-native-ui-map-screen')],
          ['seed zoom label', (n) => textIncludes(n, 'Zoom: 12')],
          [
            'map view sized',
            (n) => {
              const bounds = matching(n, { id: 'one-native-ui-map-view' })[0]?.bounds
              return (
                !!bounds &&
                bounds.right - bounds.left > 0 &&
                bounds.bottom - bounds.top > 0
              )
            },
          ],
        ]),
      'one-native-ui-map-screen'
    )
    tapFresh(config, 'UiMap surface tap', { id: 'one-native-ui-map-view' })
    await expect(
      'ui-map-tap',
      (nodes) =>
        diagnose(nodes, [
          [
            'map tap reported',
            (n) => /MapTap: 3\d\.\d+,-1\d\d\.\d+/.test(uiMapLabel(n, 'maptap')),
          ],
        ]),
      'one-native-ui-map-maptap'
    )
    swipeOnNode(config, 'UiMap pan', { id: 'one-native-ui-map-view' }, 0.7, 0.3)
    await expect(
      'ui-map-gesture',
      (nodes) =>
        diagnose(nodes, [
          ['move counted', (n) => /Moves: [1-9]\d*/.test(uiMapLabel(n, 'moves'))],
          [
            'camera reported',
            (n) => /Camera: 3\d\.\d+,-1\d\d\.\d+,\d+\.\d/.test(uiMapLabel(n, 'camera')),
          ],
        ]),
      'one-native-ui-map-moves'
    )
    tapFresh(config, 'UiMap zoom button', {
      id: 'one-native-ui-map-zoom',
      role: 'button',
      clickable: true,
    })
    await expect(
      'ui-map-zoom-prop',
      (nodes) => textIncludes(nodes, 'Zoom: 10'),
      'one-native-ui-map-zoom'
    )
    tapFresh(config, 'UiMap pins button', {
      id: 'one-native-ui-map-pins',
      role: 'button',
      clickable: true,
    })
    await expect(
      'ui-map-pins-prop',
      (nodes) => textIncludes(nodes, 'Pins: 3'),
      'one-native-ui-map-pins'
    )

    pressBack(config)
    await portal()
    pressBack(config)
    await pager()

    // the webgpu path: a raw triangle pane plus an R3F cube on
    // WebGPURenderer. dawn needs vulkan; if the emulator image cannot
    // provide it this leg runs on hardware instead (see the suite notes).
    pressBack(config)
    await tapNavigation(config, 'nav-one-native-gpu')
    const gpuTicks = (nodes: Node[]) =>
      Number(
        matching(nodes, { id: 'one-native-gpu-ticks' })[0]?.text?.slice(
          'Ticks: '.length
        ) ?? -1
      )
    await expect(
      'gpu-panes-painted',
      (nodes) =>
        diagnose(nodes, [
          ['screen mounted', (n) => exactlyOneId(n, 'one-native-gpu-screen')],
          ['triangle ready', (n) => textIncludes(n, 'Triangle: ready')],
          ['fiber ready', (n) => textIncludes(n, 'Fiber: ready')],
        ]),
      'one-native-gpu-screen'
    )
    const gpuBefore = gpuTicks(dumpNodes(config).nodes)
    await expect(
      'gpu-fiber-loop-ticks',
      (nodes) => gpuTicks(nodes) > gpuBefore,
      'one-native-gpu-ticks'
    )
    await expect(
      'gpu-shader-verdict',
      (nodes) =>
        diagnose(nodes, [
          [
            'probe decided',
            (n) =>
              textIncludes(n, 'Shader: clean') ||
              n.some((node) => (node.text ?? '').startsWith('Shader: unsupported:')),
          ],
        ]),
      'one-native-gpu-shader'
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

async function runCompose(config: Config) {
  mkdirSync(config.artifactDir, { recursive: true })
  preflight(config)
  requireMetroReverse(config)
  stampDebugHost(config)
  relaunchApp(config)

  let captureNumber = 0
  const idText = (nodes: Node[], id: string, expected: string) =>
    matching(nodes, { id }).some((node) => nodeValues(node).some((value) => value.includes(expected)))
  const check = async (name: string, predicate: (nodes: Node[]) => boolean) => {
    const { snapshot: current } = await waitFor(config, name, predicate)
    const stem = `${String(++captureNumber).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
    const png = adbBytes(config, ['exec-out', 'screencap', '-p'])
    if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
      throw new Error(`${name} screenshot was not a PNG`)
    writeFileSync(path.join(config.artifactDir, `${stem}.png`), png)
    writeFileSync(path.join(config.artifactDir, `${stem}.xml`), current.xml)
    console.log(`PASS ${name}`)
  }
  const home = () => check('compose-home', (nodes) => exactlyOneId(nodes, 'home-screen'))
  const progress = async () => {
    await tapNavigation(config, 'nav-one-native-android-progress')
    await check('compose-progress-mounted', (nodes) =>
      ['linear', 'linear-wavy', 'circular', 'circular-wavy', 'linear-indeterminate', 'circular-indeterminate'].every((variant) =>
        exactlyOneId(nodes, `one-native-android-progress-${variant}`)
      ) && idText(nodes, 'one-native-android-progress-status', 'Progress: 0.25')
    )
    tapFresh(config, 'advance progress', { id: 'one-native-android-progress-advance' })
    await check('compose-progress-advanced', (nodes) =>
      idText(nodes, 'one-native-android-progress-status', 'Progress: 0.75') &&
      exactlyOneId(nodes, 'one-native-android-progress-linear-wavy') &&
      exactlyOneId(nodes, 'one-native-android-progress-circular-wavy')
    )
  }
  const segmented = async () => {
    await tapNavigation(config, 'nav-one-native-android-segmented')
    await check('compose-segmented-mounted', (nodes) =>
      ['first', 'second', 'single-disabled', 'multi-fixed', 'multi-control', 'multi-disabled'].every((name) =>
        exactlyOneId(nodes, `one-native-android-segmented-${name}`)
      ) &&
      matching(nodes, { id: 'one-native-android-segmented-single-disabled' }).some((node) => node.enabled === false) &&
      matching(nodes, { id: 'one-native-android-segmented-multi-disabled' }).some((node) => node.enabled === false) &&
      matching(nodes, { id: 'one-native-android-segmented-first' }).some((node) => node.checked === true) &&
      matching(nodes, { id: 'one-native-android-segmented-second' }).some((node) => node.checked === false) &&
      matching(nodes, { id: 'one-native-android-segmented-multi-control' }).some((node) => node.checked === false) &&
      idText(nodes, 'one-native-android-segmented-status', 'Single: First · Checked: no · Policy: reject · Requests: 0 · Disabled: 0')
    )
    tapFresh(config, 'single choice second', { id: 'one-native-android-segmented-second' })
    await check('compose-segmented-single-selected', (nodes) =>
      idText(nodes, 'one-native-android-segmented-status', 'Single: Second · Checked: no')
    )
    tapFresh(config, 'multi choice rejected', { id: 'one-native-android-segmented-multi-control' })
    await check('compose-segmented-rejected', (nodes) =>
      idText(nodes, 'one-native-android-segmented-status', 'Checked: no · Policy: reject · Requests: 1')
    )
    tapFresh(config, 'accept multi choice requests', { id: 'one-native-android-segmented-policy' })
    await check('compose-segmented-policy', (nodes) =>
      idText(nodes, 'one-native-android-segmented-status', 'Checked: no · Policy: accept · Requests: 1')
    )
    tapFresh(config, 'multi choice accepted', { id: 'one-native-android-segmented-multi-control' })
    await check('compose-segmented-accepted', (nodes) =>
      idText(nodes, 'one-native-android-segmented-status', 'Checked: yes · Policy: accept · Requests: 2') &&
      matching(nodes, { id: 'one-native-android-segmented-second' }).some((node) => node.checked === true) &&
      matching(nodes, { id: 'one-native-android-segmented-multi-control' }).some((node) => node.checked === true)
    )
    tapFresh(config, 'disabled single choice', { id: 'one-native-android-segmented-single-disabled' })
    tapFresh(config, 'disabled multi choice', { id: 'one-native-android-segmented-multi-disabled' })
    await check('compose-segmented-disabled', (nodes) =>
      idText(nodes, 'one-native-android-segmented-status', 'Single: Second · Checked: yes · Policy: accept · Requests: 2 · Disabled: 0')
    )
  }
  const pickers = async () => {
    const status = (text: string) => (nodes: Node[]) => idText(nodes, 'one-native-android-pickers-status', text)
    const dayNodes = (nodes: Node[], day: number) =>
      nodes.filter((node) => new RegExp(`\\bOctober ${day}, 2026$`).test(node.text) && node.checkable)
    const day = (nodes: Node[], value: number) => dayNodes(nodes, value).length === 1 ? dayNodes(nodes, value)[0] : undefined
    // compose semantics nodes carry no resource id, so these taps resolve one node by its text
    const tapText = (name: string, find: (nodes: Node[]) => Node[]) => {
      const found = find(snapshot(config).nodes)
      if (found.length !== 1) throw new Error(`${name} resolved ${found.length} nodes; exactly one is required.`)
      const bounds = validBounds(found[0], name)
      adbText(config, ['shell', 'input', 'tap', String(Math.round((bounds.left + bounds.right) / 2)), String(Math.round((bounds.top + bounds.bottom) / 2))])
    }
    await tapNavigation(config, 'nav-one-native-android-pickers')
    await check('compose-pickers-mounted', (nodes) =>
      exactlyOneId(nodes, 'one-native-android-pickers-date') &&
      day(nodes, 5)?.checked === true &&
      day(nodes, 2)?.enabled === false &&
      day(nodes, 31)?.enabled === false &&
      day(nodes, 15)?.enabled === true &&
      status('Date: 2026-10-05 14:37 · Time: 14:37 · Policy: reject · Requests: 0 · Dialog: none')(nodes)
    )
    tapText('day 15 rejected', (nodes) => dayNodes(nodes, 15))
    await check('compose-pickers-date-rejected', (nodes) =>
      status('Date: 2026-10-05 14:37 · Time: 14:37 · Policy: reject · Requests: 1')(nodes) &&
      day(nodes, 5)?.checked === true &&
      day(nodes, 15)?.checked === false
    )
    tapText('disabled day 2', (nodes) => dayNodes(nodes, 2))
    tapFresh(config, 'accept picker requests', { id: 'one-native-android-pickers-policy' })
    await check('compose-pickers-policy', status('Policy: accept · Requests: 1'))
    tapText('day 15 accepted', (nodes) => dayNodes(nodes, 15))
    await check('compose-pickers-date-accepted', (nodes) =>
      status('Date: 2026-10-15 14:37 · Time: 14:37 · Policy: accept · Requests: 2 · Dialog: none')(nodes) &&
      day(nodes, 15)?.checked === true &&
      day(nodes, 5)?.checked === false
    )
    tapFresh(config, 'show inline time picker', { id: 'one-native-android-pickers-swap' })
    await check('compose-pickers-time-mounted', (nodes) =>
      exactlyOneId(nodes, 'one-native-android-pickers-time') &&
      nodes.some((node) => node.contentDescription === '14 hours' && node.text === '14')
    )
    const hour = (value: number) => (nodes: Node[]) => nodes.filter((node) => node.contentDescription === `${value} hours` && !node.text)
    tapText('dial hour 9', hour(9))
    await check('compose-pickers-time-accepted', (nodes) =>
      status('Date: 2026-10-15 14:37 · Time: 09:37 · Policy: accept · Requests: 3 · Dialog: none')(nodes) &&
      nodes.some((node) => node.contentDescription === '9 hours' && /^0?9$/.test(node.text))
    )
    const button = (label: string) => (nodes: Node[]) => nodes.filter((node) => node.text === label)
    tapFresh(config, 'open date dialog', { id: 'one-native-android-pickers-open-date' })
    await check('compose-pickers-date-dialog-open', (nodes) =>
      button('Use date')(nodes).length === 1 && day(nodes, 15)?.checked === true
    )
    tapText('dialog day 20', (nodes) => dayNodes(nodes, 20))
    await check('compose-pickers-date-dialog-changed', (nodes) => day(nodes, 20)?.checked === true)
    tapText('confirm date dialog', button('Use date'))
    await check('compose-pickers-date-dialog-confirmed', status('Date: 2026-10-15 14:37 · Time: 09:37 · Policy: accept · Requests: 3 · Dialog: date 2026-10-20 14:37'))
    tapFresh(config, 'reopen date dialog', { id: 'one-native-android-pickers-open-date' })
    await check('compose-pickers-date-dialog-reopened', (nodes) =>
      button('Use date')(nodes).length === 1 && day(nodes, 15)?.checked === true && day(nodes, 20)?.checked === false
    )
    tapText('cancel date dialog', button('Cancel'))
    await check('compose-pickers-date-dialog-dismissed', (nodes) =>
      status('Dialog: dismissed')(nodes) && button('Use date')(nodes).length === 0
    )
    tapFresh(config, 'show inline date picker', { id: 'one-native-android-pickers-swap' })
    await check('compose-pickers-date-remounted', (nodes) => day(nodes, 15)?.checked === true)
    tapFresh(config, 'open time dialog', { id: 'one-native-android-pickers-open-time' })
    await check('compose-pickers-time-dialog-open', (nodes) =>
      button('Use time')(nodes).length === 1 && nodes.some((node) => node.contentDescription === '9 hours' && /^0?9$/.test(node.text))
    )
    tapText('dialog hour 18', hour(18))
    tapText('confirm time dialog', button('Use time'))
    await check('compose-pickers-time-dialog-confirmed', status('Date: 2026-10-15 14:37 · Time: 09:37 · Policy: accept · Requests: 3 · Dialog: time 2026-10-05 18:37'))
  }
  const surface = async () => {
    await tapNavigation(config, 'nav-one-native-android-surface')
    await check('compose-surface-mounted', (nodes) =>
      ['plain', 'clickable', 'selectable', 'toggleable', 'disabled'].every((variant) =>
        exactlyOneId(nodes, `one-native-android-surface-${variant}`)
      ) &&
      matching(nodes, { id: 'one-native-android-surface-selectable' }).some((node) => node.checked === false) &&
      matching(nodes, { id: 'one-native-android-surface-toggleable' }).some((node) => node.checked === false) &&
      matching(nodes, { id: 'one-native-android-surface-disabled' }).some((node) => node.enabled === false) &&
      idText(nodes, 'one-native-android-surface-status', 'Clicks: 0 · Selected: no · Checked: no · Policy: reject · Requests: 0 · Disabled: 0')
    )
    tapFresh(config, 'clickable surface', { id: 'one-native-android-surface-clickable' })
    await check('compose-surface-click', (nodes) =>
      idText(nodes, 'one-native-android-surface-status', 'Clicks: 1 · Selected: no')
    )
    tapFresh(config, 'selectable surface', { id: 'one-native-android-surface-selectable' })
    await check('compose-surface-selected', (nodes) =>
      idText(nodes, 'one-native-android-surface-status', 'Selected: yes · Checked: no') &&
      matching(nodes, { id: 'one-native-android-surface-selectable' }).some((node) => node.checked === true)
    )
    tapFresh(config, 'toggleable surface', { id: 'one-native-android-surface-toggleable' })
    await check('compose-surface-rejected', (nodes) =>
      idText(nodes, 'one-native-android-surface-status', 'Checked: no · Policy: reject · Requests: 1') &&
      matching(nodes, { id: 'one-native-android-surface-toggleable' }).some((node) => node.checked === false)
    )
    tapFresh(config, 'surface policy', { id: 'one-native-android-surface-policy' })
    await check('compose-surface-policy', (nodes) =>
      idText(nodes, 'one-native-android-surface-status', 'Checked: no · Policy: accept · Requests: 1')
    )
    tapFresh(config, 'toggleable surface', { id: 'one-native-android-surface-toggleable' })
    await check('compose-surface-accepted', (nodes) =>
      idText(nodes, 'one-native-android-surface-status', 'Checked: yes · Policy: accept · Requests: 2') &&
      matching(nodes, { id: 'one-native-android-surface-toggleable' }).some((node) => node.checked === true)
    )
    tapFresh(config, 'disabled surface', { id: 'one-native-android-surface-disabled' })
    await check('compose-surface-disabled', (nodes) =>
      idText(nodes, 'one-native-android-surface-status', 'Requests: 2 · Disabled: 0') &&
      matching(nodes, { id: 'one-native-android-surface-disabled' }).some((node) => node.enabled === false)
    )
  }
  const loading = async () => {
    await tapNavigation(config, 'nav-one-native-android-loading')
    await check('compose-loading-mounted', (nodes) =>
      ['indeterminate', 'contained', 'determinate', 'contained-determinate'].every((variant) =>
        exactlyOneId(nodes, `one-native-android-loading-${variant}`)
      ) && idText(nodes, 'one-native-android-loading-status', 'Progress: 0.25')
    )
    tapFresh(config, 'advance loading progress', { id: 'one-native-android-loading-advance' })
    await check('compose-loading-advanced', (nodes) =>
      idText(nodes, 'one-native-android-loading-status', 'Progress: 0.75') &&
      exactlyOneId(nodes, 'one-native-android-loading-determinate') &&
      exactlyOneId(nodes, 'one-native-android-loading-contained-determinate')
    )
  }
  const badges = async () => {
    await tapNavigation(config, 'nav-one-native-android-badges')
    await check('compose-badge-variants', (nodes) => {
      const dot = matching(nodes, { id: 'one-native-android-badge-dot' })[0]?.bounds
      const count = matching(nodes, { id: 'one-native-android-badge-count' })[0]?.bounds
      const wide = matching(nodes, { id: 'one-native-android-badge-wide' })[0]?.bounds
      const overlaid = matching(nodes, { id: 'one-native-android-badged-box-count' })[0]?.bounds
      const overlaidCount = matching(nodes, { id: 'one-native-android-badged-box-count-text' })[0]?.bounds
      return Boolean(
        dot && count && wide && overlaid && overlaidCount &&
        exactlyOneId(nodes, 'one-native-android-badged-box-default') &&
        idText(nodes, 'one-native-android-badge-count-text', '7') &&
        idText(nodes, 'one-native-android-badge-wide-text', '999+') &&
        idText(nodes, 'one-native-android-badged-box-count-text', '3') &&
        dot.right - dot.left < count.right - count.left &&
        wide.right - wide.left > 2 * (count.right - count.left) &&
        overlaidCount.left > (overlaid.left + overlaid.right) / 2 &&
        overlaidCount.top < (overlaid.top + overlaid.bottom) / 2
      )
    })
  }
  const listItems = async () => {
    await tapNavigation(config, 'nav-one-native-android-list-items')
    await check('compose-list-item-slots', (nodes) => {
      const full = matching(nodes, { id: 'one-native-android-list-item-full' })[0]?.bounds
      const overline = matching(nodes, { id: 'one-native-android-list-item-overline' })[0]?.bounds
      const headline = matching(nodes, { id: 'one-native-android-list-item-headline' })[0]?.bounds
      const supporting = matching(nodes, { id: 'one-native-android-list-item-supporting' })[0]?.bounds
      const trailing = matching(nodes, { id: 'one-native-android-list-item-trailing' })[0]?.bounds
      const minimal = matching(nodes, { id: 'one-native-android-list-item-minimal' })[0]?.bounds
      return Boolean(
        full && overline && headline && supporting && trailing && minimal &&
        idText(nodes, 'one-native-android-list-item-overline', 'Messages') &&
        idText(nodes, 'one-native-android-list-item-headline', 'Inbox') &&
        idText(nodes, 'one-native-android-list-item-supporting', 'Three unread messages') &&
        idText(nodes, 'one-native-android-list-item-trailing', '3') &&
        idText(nodes, 'one-native-android-list-item-minimal-headline', 'Archived') &&
        overline.top < headline.top && headline.top < supporting.top &&
        trailing.left > headline.right && minimal.top > full.bottom
      )
    })
  }
  const flowRow = async () => {
    await tapNavigation(config, 'nav-one-native-android-flow-row')
    await check('compose-flow-row-wraps', (nodes) => {
      const cells = [0, 1, 2, 3, 4].map((index) =>
        matching(nodes, { id: `one-native-android-flow-cell-${index}` })[0]?.bounds
      )
      const [first, second, third, fourth, fifth] = cells
      return Boolean(
        exactlyOneId(nodes, 'one-native-android-flow-row') &&
        first && second && third && fourth && fifth &&
        first.top === second.top && third.top === fourth.top &&
        third.top > first.bottom && fifth.top > third.bottom &&
        second.left > first.right && fourth.left > third.right &&
        third.left === first.left && fifth.left === first.left
      )
    })
    await check('compose-spacer-weights', (nodes) => {
      const row = matching(nodes, { id: 'one-native-android-spacer-row' })[0]?.bounds
      const left = matching(nodes, { id: 'one-native-android-spacer-left' })[0]?.bounds
      const right = matching(nodes, { id: 'one-native-android-spacer-right' })[0]?.bounds
      const column = matching(nodes, { id: 'one-native-android-spacer-column' })[0]?.bounds
      const top = matching(nodes, { id: 'one-native-android-spacer-top' })[0]?.bounds
      const bottom = matching(nodes, { id: 'one-native-android-spacer-bottom' })[0]?.bounds
      return Boolean(
        row && left && right && column && top && bottom &&
        idText(nodes, 'one-native-android-spacer-left', 'Left') &&
        idText(nodes, 'one-native-android-spacer-right', 'Right') &&
        idText(nodes, 'one-native-android-spacer-top', 'Top') &&
        idText(nodes, 'one-native-android-spacer-bottom', 'Bottom') &&
        left.left === row.left && right.right === row.right &&
        right.left - left.right > (row.right - row.left) / 2 &&
        top.top === column.top && bottom.bottom === column.bottom &&
        bottom.top - top.bottom > (column.bottom - column.top) / 2
      )
    })
  }
  const iconButtons = async () => {
    await tapNavigation(config, 'nav-one-native-android-icon-buttons')
    await check('compose-icon-button-variants', (nodes) =>
      ['standard', 'filled', 'tonal', 'outlined', 'disabled'].every((variant) =>
        exactlyOneId(nodes, `one-native-android-icon-button-${variant}`)
      ) && exactlyOneId(nodes, 'one-native-android-button-tonal') &&
      exactlyOneId(nodes, 'one-native-android-button-elevated') &&
      ['small', 'medium', 'large', 'extended'].every((variant) =>
        exactlyOneId(nodes, `one-native-android-fab-${variant}`)
      ) &&
      ['standard', 'icon', 'filled', 'outlined', 'disabled'].every((variant) =>
        exactlyOneId(nodes, `one-native-android-toggle-button-${variant}`)
      ) &&
      idText(nodes, 'one-native-android-toggle-status', 'Toggle: off · Policy: reject · Requests: 0 · Disabled: 0') &&
      idText(nodes, 'one-native-android-icon-buttons-status', 'Clicks: 0 · Disabled: 0')
    )
    tapFresh(config, 'filled icon button', { id: 'one-native-android-icon-button-filled' })
    await check('compose-icon-button-click', (nodes) =>
      idText(nodes, 'one-native-android-icon-buttons-status', 'Clicks: 1 · Disabled: 0')
    )
    tapFresh(config, 'tonal button', { id: 'one-native-android-button-tonal' })
    await check('compose-tonal-button-click', (nodes) =>
      idText(nodes, 'one-native-android-icon-buttons-status', 'Clicks: 2 · Disabled: 0')
    )
    tapFresh(config, 'elevated button', { id: 'one-native-android-button-elevated' })
    await check('compose-elevated-button-click', (nodes) =>
      idText(nodes, 'one-native-android-icon-buttons-status', 'Clicks: 3 · Disabled: 0')
    )
    tapFresh(config, 'small floating action button', { id: 'one-native-android-fab-small' })
    await check('compose-fab-small-click', (nodes) =>
      idText(nodes, 'one-native-android-icon-buttons-status', 'Clicks: 4 · Disabled: 0')
    )
    tapFresh(config, 'medium floating action button', { id: 'one-native-android-fab-medium' })
    await check('compose-fab-medium-click', (nodes) =>
      idText(nodes, 'one-native-android-icon-buttons-status', 'Clicks: 5 · Disabled: 0')
    )
    tapFresh(config, 'large floating action button', { id: 'one-native-android-fab-large' })
    await check('compose-fab-large-click', (nodes) =>
      idText(nodes, 'one-native-android-icon-buttons-status', 'Clicks: 6 · Disabled: 0')
    )
    tapFresh(config, 'extended floating action button', { id: 'one-native-android-fab-extended' })
    await check('compose-fab-extended-click', (nodes) =>
      idText(nodes, 'one-native-android-icon-buttons-status', 'Clicks: 7 · Disabled: 0')
    )
    tapFresh(config, 'standard toggle button', { id: 'one-native-android-toggle-button-standard' })
    await check('compose-toggle-rejected', (nodes) =>
      idText(nodes, 'one-native-android-toggle-status', 'Toggle: off · Policy: reject · Requests: 1 · Disabled: 0')
    )
    tapFresh(config, 'toggle policy', { id: 'one-native-android-toggle-policy' })
    await check('compose-toggle-policy', (nodes) =>
      idText(nodes, 'one-native-android-toggle-status', 'Toggle: off · Policy: accept · Requests: 1 · Disabled: 0')
    )
    tapFresh(config, 'standard toggle button', { id: 'one-native-android-toggle-button-standard' })
    await check('compose-toggle-accepted', (nodes) =>
      idText(nodes, 'one-native-android-toggle-status', 'Toggle: on · Policy: accept · Requests: 2 · Disabled: 0')
    )
    tapFresh(config, 'icon toggle button', { id: 'one-native-android-toggle-button-icon' })
    await check('compose-toggle-icon-click', (nodes) =>
      idText(nodes, 'one-native-android-toggle-status', 'Toggle: off · Policy: accept · Requests: 3 · Disabled: 0')
    )
    tapFresh(config, 'filled icon toggle button', { id: 'one-native-android-toggle-button-filled' })
    await check('compose-toggle-filled-click', (nodes) =>
      idText(nodes, 'one-native-android-toggle-status', 'Toggle: on · Policy: accept · Requests: 4 · Disabled: 0')
    )
    tapFresh(config, 'outlined icon toggle button', { id: 'one-native-android-toggle-button-outlined' })
    await check('compose-toggle-outlined-click', (nodes) =>
      idText(nodes, 'one-native-android-toggle-status', 'Toggle: off · Policy: accept · Requests: 5 · Disabled: 0')
    )
    tapFresh(config, 'disabled icon toggle button', { id: 'one-native-android-toggle-button-disabled' })
    await check('compose-toggle-disabled', (nodes) =>
      idText(nodes, 'one-native-android-toggle-status', 'Toggle: off · Policy: accept · Requests: 5 · Disabled: 0')
    )
    tapFresh(config, 'disabled icon button', { id: 'one-native-android-icon-button-disabled' })
    await check('compose-icon-button-disabled', (nodes) =>
      idText(nodes, 'one-native-android-icon-buttons-status', 'Clicks: 7 · Disabled: 0')
    )
  }

  await home()
  if (config.suite === 'compose-badges') {
    await badges()
    console.log('ALL ONE NATIVE ANDROID BADGE CHECKS PASSED')
    return
  }
  if (config.suite === 'compose-list-items') {
    await listItems()
    console.log('ALL ONE NATIVE ANDROID LIST ITEM CHECKS PASSED')
    return
  }
  if (config.suite === 'compose-flow-row') {
    await flowRow()
    console.log('ALL ONE NATIVE ANDROID FLOW ROW CHECKS PASSED')
    return
  }
  if (config.suite === 'compose-icon-buttons') {
    await iconButtons()
    console.log('ALL ONE NATIVE ANDROID ICON BUTTON CHECKS PASSED')
    return
  }
  if (config.suite === 'compose-loading') {
    await loading()
    console.log('ALL ONE NATIVE ANDROID LOADING CHECKS PASSED')
    return
  }
  if (config.suite === 'compose-surface') {
    await surface()
    console.log('ALL ONE NATIVE ANDROID SURFACE CHECKS PASSED')
    return
  }
  if (config.suite === 'compose-progress') {
    await progress()
    console.log('ALL ONE NATIVE ANDROID PROGRESS CHECKS PASSED')
    return
  }
  if (config.suite === 'compose-pickers') {
    await pickers()
    console.log('ALL ONE NATIVE ANDROID PICKER CHECKS PASSED')
    return
  }
  if (config.suite === 'compose-segmented') {
    await segmented()
    console.log('ALL ONE NATIVE ANDROID SEGMENTED CHECKS PASSED')
    return
  }
  await tapNavigation(config, 'nav-one-native-android-selection')
  await check('compose-selection-mounted', (nodes) =>
    idText(nodes, 'one-native-android-checkbox-status', 'Value: off · Request: off') &&
    idText(nodes, 'one-native-android-radio-status', 'Radio: first · Clicks: 0')
  )
  tapFresh(config, 'checkbox controlled request', { id: 'one-native-android-checkbox-control' })
  await check('compose-checkbox-rejected', (nodes) =>
    idText(nodes, 'one-native-android-checkbox-status', 'Value: off · Request: on · Policy: reject')
  )
  tapFresh(config, 'radio second', { id: 'one-native-android-radio-second' })
  await check('compose-radio-selected', (nodes) =>
    idText(nodes, 'one-native-android-radio-status', 'Radio: second · Clicks: 1 · Disabled clicks: 0')
  )

  pressBack(config)
  await home()
  await tapNavigation(config, 'nav-one-native-android-cards')
  await check('compose-card-variants', (nodes) =>
    exactlyOneId(nodes, 'one-native-android-card-filled') &&
    exactlyOneId(nodes, 'one-native-android-card-elevated') &&
    exactlyOneId(nodes, 'one-native-android-card-outlined') &&
    idText(nodes, 'one-native-android-card-filled-text', 'Filled card') &&
    idText(nodes, 'one-native-android-card-elevated-text', 'Elevated card') &&
    idText(nodes, 'one-native-android-card-outlined-text', 'Outlined card')
  )

  pressBack(config)
  await home()
  await tapNavigation(config, 'nav-one-native-android-dividers')
  await check('compose-divider-orientations', (nodes) => {
    const horizontal = matching(nodes, { id: 'one-native-android-divider-horizontal' })[0]?.bounds
    const vertical = matching(nodes, { id: 'one-native-android-divider-vertical' })[0]?.bounds
    return Boolean(horizontal && vertical &&
      horizontal.right - horizontal.left > 10 * (horizontal.bottom - horizontal.top) &&
      vertical.bottom - vertical.top > 5 * (vertical.right - vertical.left))
  })

  pressBack(config)
  await home()
  await tapNavigation(config, 'nav-one-native-android-filter-chip')
  await check('compose-filter-chip-slots', (nodes) =>
    idText(nodes, 'one-native-android-filter-chip-status', 'Selected: no · Requests: 0 · Policy: reject') &&
    exactlyOneId(nodes, 'one-native-android-filter-chip-label') &&
    exactlyOneId(nodes, 'one-native-android-filter-chip-leading') &&
    exactlyOneId(nodes, 'one-native-android-filter-chip-trailing')
  )
  tapFresh(config, 'filter chip rejected click', { id: 'one-native-android-filter-chip-control' })
  await check('compose-filter-chip-rejected', (nodes) =>
    idText(nodes, 'one-native-android-filter-chip-status', 'Selected: no · Requests: 1 · Policy: reject')
  )
  tapFresh(config, 'filter chip policy', { id: 'one-native-android-filter-chip-policy' })
  await check('compose-filter-chip-policy', (nodes) =>
    idText(nodes, 'one-native-android-filter-chip-status', 'Policy: accept')
  )
  tapFresh(config, 'filter chip accepted click', { id: 'one-native-android-filter-chip-control' })
  await check('compose-filter-chip-selected', (nodes) =>
    idText(nodes, 'one-native-android-filter-chip-status', 'Selected: yes · Requests: 2 · Policy: accept')
  )
  tapFresh(config, 'disabled filter chip', { id: 'one-native-android-filter-chip-disabled' })
  await check('compose-filter-chip-disabled', (nodes) =>
    idText(nodes, 'one-native-android-filter-chip-disabled-status', 'Disabled requests: 0')
  )

  pressBack(config)
  await home()
  await tapNavigation(config, 'nav-one-native-android-chips')
  await check('compose-chip-variants-mounted', (nodes) =>
    exactlyOneId(nodes, 'one-native-android-assist-chip-label') &&
    exactlyOneId(nodes, 'one-native-android-assist-chip-leading') &&
    exactlyOneId(nodes, 'one-native-android-assist-chip-trailing') &&
    exactlyOneId(nodes, 'one-native-android-input-chip-label') &&
    exactlyOneId(nodes, 'one-native-android-input-chip-avatar') &&
    exactlyOneId(nodes, 'one-native-android-input-chip-trailing') &&
    exactlyOneId(nodes, 'one-native-android-suggestion-chip-label') &&
    exactlyOneId(nodes, 'one-native-android-suggestion-chip-icon') &&
    idText(nodes, 'one-native-android-chips-status', 'Assist: 0 · Input: off · Suggestion: 0 · Disabled: 0')
  )
  tapFresh(config, 'assist chip', { id: 'one-native-android-assist-chip' })
  await check('compose-assist-chip-click', (nodes) =>
    idText(nodes, 'one-native-android-chips-status', 'Assist: 1 · Input: off · Suggestion: 0 · Disabled: 0')
  )
  tapFresh(config, 'input chip', { id: 'one-native-android-input-chip' })
  await check('compose-input-chip-selected', (nodes) =>
    idText(nodes, 'one-native-android-chips-status', 'Assist: 1 · Input: selected · Suggestion: 0 · Disabled: 0')
  )
  tapFresh(config, 'suggestion chip', { id: 'one-native-android-suggestion-chip' })
  await check('compose-suggestion-chip-click', (nodes) =>
    idText(nodes, 'one-native-android-chips-status', 'Assist: 1 · Input: selected · Suggestion: 1 · Disabled: 0')
  )
  tapFresh(config, 'disabled suggestion chip', { id: 'one-native-android-suggestion-chip-disabled' })
  await check('compose-suggestion-chip-disabled', (nodes) =>
    idText(nodes, 'one-native-android-chips-status', 'Assist: 1 · Input: selected · Suggestion: 1 · Disabled: 0')
  )

  pressBack(config)
  await home()
  await badges()
  console.log('ALL ONE NATIVE ANDROID COMPOSE CHECKS PASSED')
}

// the updates suite: the release apk baked the static server in at prebuild
// time (10.0.2.2 reaches the host loopback). it starts from a fresh install
// and walks eight publishes: cold launch, stage and launch, tamper, fatal
// rollback, splash kill, in-session reloads, deleted bundle, the reaper, and
// a foreign runtime version. the launcher's files are read through run-as,
// so the apk is a release build made debuggable by
// scripts/updates-suite-release.gradle (./gradlew assembleRelease
// --init-script <it>).
async function runUpdates(config: Config) {
  mkdirSync(config.artifactDir, { recursive: true })
  preflight(config)
  execFileSync('adb', ['-s', config.deviceId, 'uninstall', config.packageId], { stdio: 'ignore' })
  adbText(config, ['install', config.apkPath])

  const updatesDir = 'files/one-updates'
  const inApp = (...args: string[]) => adbText(config, ['shell', 'run-as', config.packageId, ...args])
  const updateIdsOnDisk = () =>
    updateIdsIn(inApp('ls', '-a', updatesDir).split(/\s+/).filter((name) => name && name !== '.' && name !== '..'))
  const readState = () => parseUpdatesState(inApp('cat', `${updatesDir}/state.json`))
  const stopApp = () => adbText(config, ['shell', 'am', 'force-stop', config.packageId])
  const launchApp = () => relaunchApp(config)
  const coldLaunch = () => {
    stopApp()
    launchApp()
  }
  const wait = async (name: string, predicate: (nodes: Node[]) => boolean) => {
    const result = await waitFor(config, name, predicate)
    console.log(`PASS ${name}`)
    return result.snapshot.nodes
  }
  const pass = (name: string) => console.log(`PASS ${name}`)
  const labelValue = (nodes: Node[], prefix: string) => {
    const text = nodes.find((node) => node.text.startsWith(`${prefix}: `))?.text
    return text === undefined ? undefined : text.slice(prefix.length + 2)
  }
  const home = (marker: string) => (nodes: Node[]) =>
    exactlyOneId(nodes, 'home-screen') && textIncludes(nodes, `Marker: ${marker}`)
  const tap = (testID: string) => tapFresh(config, testID, { id: testID })
  const snap = (name: string) => {
    writeFileSync(path.join(config.artifactDir, `${name}.png`), adbBytes(config, ['exec-out', 'screencap', '-p']))
    writeFileSync(path.join(config.artifactDir, `${name}.xml`), dumpNodes(config).xml)
  }
  const openFixture = async () => {
    await wait('updates home mounted', (nodes) => exactlyOneId(nodes, 'home-screen'))
    await tapNavigation(config, 'nav-one-native-updates')
    // the button exists while the push is still sliding it in, and a tap at
    // that frame lands beside it: wait until two snapshots agree.
    let previous: Bounds | undefined
    await wait('updates fixture mounted', (nodes) => {
      const bounds = matching(nodes, { id: 'one-native-updates-check' })[0]?.bounds
      const settled = Boolean(
        bounds && previous && bounds.left === previous.left && bounds.top === previous.top
      )
      previous = bounds
      return settled
    })
  }

  const updates = startUpdatesServer(config.artifactDir, 'android')
  const { publish } = updates
  // bounded proof mode: the first genuine happy-path cycle only (embedded
  // launch, publish v2 check/fetch/stage/cold-apply, publish p5
  // check/fetch/reload-apply). skips the tamper/rollback/stress matrices;
  // every kept assertion is unchanged.
  const happyOnly = process.env.ONE_UPDATES_HAPPY_PATH_ONLY === '1'
  try {
    launchApp()

    // 1. a fresh install launches embedded, and an empty server checks none.
    await openFixture()
    const embedded = await wait('embedded launch reads the binary', (n) =>
      Boolean(
        labelValue(n, 'Marker') === 'embedded' &&
          labelValue(n, 'Enabled') === 'true' &&
          labelValue(n, 'Embedded') === 'true' &&
          labelValue(n, 'Runtime') === 'updates-suite' &&
          labelValue(n, 'UpdateId') !== undefined &&
          labelValue(n, 'UpdateId') !== 'none' &&
          labelValue(n, 'Created') !== undefined &&
          labelValue(n, 'Created') !== 'none' &&
          labelValue(n, 'Meta') === 'none' &&
          labelValue(n, 'Staged') === 'none' &&
          labelValue(n, 'Image') === 'none'
      )
    )
    const embeddedId = labelValue(embedded, 'UpdateId')
    if (!embeddedId || embeddedId === 'none') throw new Error('embedded launch has no update id')
    if (happyOnly) snap('updates-embedded')
    tap('one-native-updates-check')
    await wait('empty server checks none', (n) => labelValue(n, 'Check') === 'none')
    tap('one-native-updates-fetch')
    await wait('empty server fetches none', (n) => labelValue(n, 'Fetch') === 'none')

    // 2. a published update stages, then runs after a cold relaunch with the
    // image only its own bundle carries.
    const first = publish('v2')
    // the publish saturates the host; tapping check immediately after fails
    // before its request reaches the server, so let host and emulator settle.
    if (happyOnly) await Bun.sleep(60_000)
    tap('one-native-updates-check')
    await wait('served update checks available', (n) => labelValue(n, 'Check') === `available:${first.id}`)
    tap('one-native-updates-fetch')
    await wait('served update fetches', (n) =>
      Boolean(
        labelValue(n, 'Fetch') === `fetched:${first.id}` &&
          labelValue(n, 'Staged') === first.id &&
          labelValue(n, 'StagedEvents') === `1:${first.id}`
      )
    )
    coldLaunch()
    await wait('relaunched update boots', home('v2'))
    await openFixture()
    await wait('relaunched update runs staged bundle and image', (n) =>
      Boolean(
        labelValue(n, 'Marker') === 'v2' &&
          labelValue(n, 'Embedded') === 'false' &&
          labelValue(n, 'UpdateId') === first.id &&
          labelValue(n, 'Staged') === 'none' &&
          labelValue(n, 'Image') === '48x32'
      )
    )
    if (happyOnly) snap('updates-v2')

    if (!happyOnly) {
    // 3. a tampered asset rejects fetch and stages nothing.
    const tampered = publish('v2')
    updates.tamperLaunchAsset()
    tap('one-native-updates-check')
    await wait('tampered update checks available', (n) => labelValue(n, 'Check') === `available:${tampered.id}`)
    tap('one-native-updates-fetch')
    await wait('tampered update rejects fetch', (n) => labelValue(n, 'Fetch') === 'error:E_UPDATES_FETCH')
    tap('one-native-updates-refresh')
    await wait('tampered update stages nothing', (n) =>
      // the step 2 relaunch remounted the fixture, so the counter reset; the
      // failed fetch must fire no event on top of that.
      Boolean(labelValue(n, 'Staged') === 'none' && labelValue(n, 'StagedEvents') === '0')
    )

    // 4. a bundle that throws before first render rolls back in-session onto
    // the previous update, and is never selected again.
    const fatal = publish('throws')
    if (fatal.id === first.id) throw new Error('republish reused the update id')
    tap('one-native-updates-check')
    await wait('fatal update checks available', (n) => labelValue(n, 'Check') === `available:${fatal.id}`)
    tap('one-native-updates-fetch')
    await wait('fatal update fetches', (n) => labelValue(n, 'Fetch') === `fetched:${fatal.id}`)
    adbText(config, ['logcat', '-c'])
    tap('one-native-updates-reload')
    // the old tree shows the same marker until the reboot replaces it, so the
    // home screen (absent on the fixture) is the completion signal.
    await wait('fatal update rolls back in-session', (n) => exactlyOneId(n, 'home-screen'))
    // the launcher logs the error it rolled back from: the bundle's own throw
    // proves it executed, which a reload that skipped the update never produces.
    const rollbackLine = adbText(config, ['logcat', '-d', '-s', 'OneUpdates'])
      .split('\n')
      .find((line) => line.includes(`update ${fatal.id} failed before first render`))
    if (!rollbackLine?.includes('updates-suite-boom'))
      throw new Error('the fatal update was skipped without booting')
    pass('fatal update booted before rolling back')
    await openFixture()
    await wait('rollback runs the previous update', (n) =>
      Boolean(labelValue(n, 'UpdateId') === first.id && labelValue(n, 'Marker') === 'v2')
    )
    // the fatal path marks the booted update failed and the reaper deletes it
    // right after the rollback lands.
    if (updateIdsOnDisk().includes(fatal.id) || readState().updates[fatal.id])
      throw new Error('the fatal update survived the rollback')
    pass('fatal update is reaped after the rollback')
    tap('one-native-updates-refresh')
    await wait('rollback leaves nothing staged', (n) => labelValue(n, 'Staged') === 'none')
    coldLaunch()
    await openFixture()
    await wait('failed update is never selected again', (n) => labelValue(n, 'UpdateId') === first.id)

    // 5. a proven update survives a kill during its splash: the kill lands
    // while launching is still recorded, and the relaunch selects it again.
    const slow = publish('slow')
    tap('one-native-updates-check')
    await wait('slow update checks available', (n) => labelValue(n, 'Check') === `available:${slow.id}`)
    tap('one-native-updates-fetch')
    await wait('slow update fetches', (n) => labelValue(n, 'Fetch') === `fetched:${slow.id}`)
    tap('one-native-updates-reload')
    await wait('slow update proves itself', home('slow'))
    await openFixture()
    await wait('slow update runs after reload', (n) => labelValue(n, 'UpdateId') === slow.id)
    stopApp()
    // am start -W returns once the first frame draws, which the slow bundle
    // holds back, so the launch goes out without waiting for it.
    adbText(config, ['shell', 'am', 'start', '-n', launcherComponent(config)])
    await Bun.sleep(2500)
    stopApp()
    const killed = readState()
    const slowEntry = killed.updates[slow.id]
    if (killed.launching !== slow.id || !slowEntry || slowEntry.successes < 1)
      throw new Error(
        `the splash kill missed its window: launching=${killed.launching} successes=${slowEntry?.successes}`
      )
    pass('splash kill lands while launching is recorded')
    launchApp()
    await wait('killed proven update is selected again', home('slow'))
    await openFixture()
    await wait('reselected update runs', (n) => labelValue(n, 'UpdateId') === slow.id)
    }

    // 6. reload runs the staged bundle in-session, then twenty reloads in a
    // row run without a crash.
    const staged = publish('p5', ['updateSeverity=critical'])
    // same post-publish settle as step 2: the check's request is lost when
    // the tap lands while the host is still saturated.
    if (happyOnly) await Bun.sleep(60_000)
    tap('one-native-updates-check')
    await wait('staged update checks available', (n) => labelValue(n, 'Check') === `available:${staged.id}`)
    tap('one-native-updates-fetch')
    await wait('staged update fetches', (n) => labelValue(n, 'Fetch') === `fetched:${staged.id}`)
    tap('one-native-updates-reload')
    await wait('reload runs the staged bundle', home('p5'))
    await openFixture()
    await wait('reloaded update reports staged metadata', (n) =>
      Boolean(labelValue(n, 'UpdateId') === staged.id && labelValue(n, 'Meta') === 'critical')
    )
    if (happyOnly) snap('updates-p5-reload')
    if (!happyOnly) for (let cycle = 1; cycle <= 20; cycle++) {
      tap('one-native-updates-reload')
      await wait(`reload ${cycle} boots clean`, home('p5'))
      await openFixture()
      await wait(`reload ${cycle} keeps the update`, (n) => labelValue(n, 'UpdateId') === staged.id)
    }

    if (!happyOnly) {
    // 7. a deleted bundle file falls through to the previous update in the
    // same launch.
    const doomed = `${updatesDir}/${staged.id}/main.jsbundle`
    inApp('ls', doomed)
    inApp('rm', doomed)
    coldLaunch()
    await wait('deleted bundle falls through', home('slow'))
    await openFixture()
    await wait('fall-through runs the spare', (n) =>
      Boolean(labelValue(n, 'UpdateId') === slow.id && labelValue(n, 'Marker') === 'slow')
    )

    // 8. after three publishes only the running update and its spare remain,
    // plus the staged one.
    const reloadInto = async (variant: string) => {
      const update = publish(variant)
      tap('one-native-updates-check')
      await wait(`${variant} update checks available`, (n) => labelValue(n, 'Check') === `available:${update.id}`)
      tap('one-native-updates-fetch')
      await wait(`${variant} update fetches`, (n) => labelValue(n, 'Fetch') === `fetched:${update.id}`)
      return update
    }
    const sixth = await reloadInto('p6')
    tap('one-native-updates-reload')
    await wait('sixth update reloads', home('p6'))
    await openFixture()
    await wait('sixth update runs', (n) => labelValue(n, 'UpdateId') === sixth.id)
    const seventh = await reloadInto('p7')
    tap('one-native-updates-reload')
    await wait('seventh update reloads', home('p7'))
    await openFixture()
    await wait('seventh update runs', (n) => labelValue(n, 'UpdateId') === seventh.id)
    const eighth = await reloadInto('p8')
    const remaining = updateIdsOnDisk()
    const expected = [sixth.id, seventh.id, eighth.id].sort()
    if (JSON.stringify(remaining) !== JSON.stringify(expected))
      throw new Error(`reaper kept ${remaining.join(', ')}, expected ${expected.join(', ')}`)
    pass('reaper keeps running, spare, and staged')

    // 9. a different runtime version on the server is never fetched.
    updates.serveForeignRuntime()
    tap('one-native-updates-check')
    await wait('foreign runtime checks none', (n) => labelValue(n, 'Check') === 'none')
    tap('one-native-updates-fetch')
    await wait('foreign runtime fetches none', (n) => labelValue(n, 'Fetch') === 'none')
    tap('one-native-updates-refresh')
    await wait('foreign runtime leaves staged alone', (n) => labelValue(n, 'Staged') === eighth.id)

    // 10. a manifest naming paths outside the updates directory is unusable.
    updates.serveEscapingPaths()
    tap('one-native-updates-check')
    await wait('escaping paths check rejects', (n) => labelValue(n, 'Check') === 'error:E_UPDATES_CHECK')
    tap('one-native-updates-fetch')
    await wait('escaping paths fetch rejects', (n) => labelValue(n, 'Fetch') === 'error:E_UPDATES_FETCH')
    tap('one-native-updates-refresh')
    await wait('escaping paths leave staged alone', (n) => labelValue(n, 'Staged') === eighth.id)
    }
  } catch (error) {
    const stem = path.join(config.artifactDir, 'updates-failure')
    try {
      writeFileSync(`${stem}.xml`, dumpNodes(config).xml)
      writeFileSync(`${stem}.png`, adbBytes(config, ['exec-out', 'screencap', '-p']))
    } catch (captureError) {
      console.error(`updates failure capture: ${captureError instanceof Error ? captureError.message : String(captureError)}`)
    }
    throw error
  } finally {
    updates.stop()
  }
  console.log(
    happyOnly
      ? 'ONE NATIVE ANDROID UPDATES HAPPY PATH PASSED'
      : 'ALL ONE NATIVE ANDROID UPDATES CHECKS PASSED'
  )
}

try {
  const config = parse(process.argv.slice(2))
  await (config.suite === 'updates'
    ? runUpdates(config)
    : config.suite === 'compose' || config.suite === 'compose-badges' || config.suite === 'compose-list-items' || config.suite === 'compose-flow-row' || config.suite === 'compose-icon-buttons' || config.suite === 'compose-loading' || config.suite === 'compose-surface' || config.suite === 'compose-progress' || config.suite === 'compose-segmented' || config.suite === 'compose-pickers'
      ? runCompose(config)
      : run(config))
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`FAIL one-native-android: ${message}`)
  process.exitCode = 1
}
