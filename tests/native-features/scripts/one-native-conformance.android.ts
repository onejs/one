#!/usr/bin/env bun
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

type Bounds = { left: number; top: number; right: number; bottom: number }

type Node = {
  index: number
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

let mostRecentSnapshot: Snapshot | undefined

const usage = () =>
  console.log(
    'Usage: bun tests/native-features/scripts/one-native-conformance.android.ts --device-id <SERIAL> --package-id <PACKAGE> [--artifact-dir <PATH>] [--timeout <MS>]'
  )

function parse(args: string[]): Config {
  let deviceId = ''
  let packageId = ''
  let artifactDir = '/tmp/one-native-android-proof'
  let timeout = 15_000

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
  return { deviceId, packageId, artifactDir, timeout }
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
  const pattern = /<node\b([\s\S]*?)(?:\/>|>)/g
  for (const [index, match] of [...xml.matchAll(pattern)].entries()) {
    const attrs = attributes(match[1])
    nodes.push({
      index,
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
  }
  return nodes
}

function snapshot(config: Config): Snapshot {
  const remote = `/sdcard/one-native-android-proof-${process.pid}.xml`
  adbText(config, ['shell', 'uiautomator', 'dump', remote])
  const xml = adbText(config, ['exec-out', 'cat', remote])
  const nodes = parseXml(xml)
  const current = { xml, nodes }
  mostRecentSnapshot = current
  assertNoRedBox(nodes)
  if (!nodes.length) throw new Error('Android accessibility XML contained no nodes.')
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
  if (role === 'header')
    return (
      (className.includes('text') || Boolean(node.text || node.contentDescription)) &&
      node.selected !== true &&
      node.clickable !== true
    )
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

async function waitFor(
  config: Config,
  name: string,
  predicate: (nodes: Node[]) => boolean,
  missingMarker?: string
) {
  const started = Date.now()
  const deadline = started + config.timeout
  while (Date.now() < deadline) {
    const current = snapshot(config)
    if (predicate(current.nodes))
      return { snapshot: current, durationMs: Date.now() - started }
    await Bun.sleep(250)
  }
  const marker = missingMarker ? `; missing mount marker ${missingMarker}` : ''
  throw new Error(`${name} timed out after ${config.timeout}ms${marker}`)
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

async function tapNavigation(config: Config) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const current = snapshot(config)
    const rows = matching(current.nodes, {
      id: 'nav-one-native-android',
      role: 'button',
      clickable: true,
    })
    if (
      rows.length === 1 &&
      visibleIn(
        validBounds(rows[0], 'Android navigation row'),
        applicationBounds(current.nodes)
      )
    ) {
      tapFresh(config, 'Android proof navigation row', {
        id: 'nav-one-native-android',
        role: 'button',
        clickable: true,
      })
      return
    }
    swipeFresh(config, 'Home navigation scroll view')
    await waitFor(config, 'Android proof navigation row becomes visible', (nodes) => {
      const visibleRows = matching(nodes, {
        id: 'nav-one-native-android',
        role: 'button',
        clickable: true,
      })
      return (
        visibleRows.length === 1 &&
        visibleIn(
          validBounds(visibleRows[0], 'Android navigation row'),
          applicationBounds(nodes)
        )
      )
    })
  }
  throw new Error('Could not bring nav-one-native-android into view on the home list.')
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

async function run(config: Config) {
  mkdirSync(config.artifactDir, { recursive: true })
  const checks: Check[] = []
  let captureNumber = 0
  let lastSnapshot: Snapshot | undefined

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
    lastSnapshot = result.snapshot
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
    adbText(config, ['shell', 'am', 'force-stop', config.packageId])
    adbText(config, [
      'shell',
      'monkey',
      '-p',
      config.packageId,
      '-c',
      'android.intent.category.LAUNCHER',
      '1',
    ])

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
          roleMatches(mounted[0], 'header') &&
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
      (nodes) => textIncludes(nodes, 'Reject switch'),
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
    const failureSnapshot = lastSnapshot || mostRecentSnapshot
    if (failureSnapshot) {
      try {
        failureArtifacts = capture('failure', failureSnapshot, 'failed', message)
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
          error: message,
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
