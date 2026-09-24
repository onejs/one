#!/usr/bin/env bun
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveVisualRegion, VISUAL_CHECKS } from './visual-declarations'
import {
  countChangedPixels,
  countMatchingPixels,
  extractCrop,
  readPng,
} from './visual-pixel-gate'

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
  'dialogs-lifecycle',
  'host',
  'containers',
  'lists',
  'groups',
  'state',
  'safe-area',
  'fonts',
  'haptics',
  'crypto',
  'app-info',
  'popover',
  'navigation',
  'accessibility',
  'media',
  'map',
  'apple-file',
  'clipboard',
  'network',
  'browser',
  'notifications',
  'image-picker',
  'ui-map',
  'gpu',
] as const
type Suite = (typeof suites)[number]
type Config = {
  simulatorId: string
  bundleId: string
  artifactDir: string
  timeout: number
  suite: Suite
  appPath: string
  jsLocation: string
}

function usage() {
  console.log(
    `Usage: bun tests/native-features/scripts/one-native-conformance.ts --simulator-id <UUID> --bundle-id <BUNDLE_ID> [--suite ${suites.join('|')}] [--artifact-dir <PATH>] [--timeout <MS>] [--app-path <PATH>] [--js-location <HOST:PORT>]`
  )
}

function parse(args: string[]): Config {
  let simulatorId = ''
  let bundleId = ''
  let artifactDir = '/tmp/one-native-conformance'
  let timeout = 15_000
  let suite: Suite = 'tabs-menu'
  let appPath = ''
  let jsLocation = ''
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
    else if (arg === '--app-path') appPath = args[++i] || ''
    else if (arg === '--js-location') jsLocation = args[++i] || ''
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
  return { simulatorId, bundleId, artifactDir, timeout, suite, appPath, jsLocation }
}

// every ui action and the accessibility snapshot go straight to the axe cli:
// xcodebuildmcp 2.6 and later only act on element refs from their own
// snapshot, and its earlier releases bundle an axe that cannot load xcode 27.
function axe(args: string[], simulatorId: string) {
  try {
    return execFileSync('axe', [...args, '--udid', simulatorId], {
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
      `axe ${args.join(' ')} failed: ${result.stderr?.toString() || result.stdout?.toString() || result.message}`
    )
  }
}

// axe describe-ui lists the app's tree first, then repeats every descendant
// as its own root, and it never sees other processes. so the snapshot keeps
// the first root, and point probes add what another process draws on top:
// a hit at the center from another pid is a remote sheet (safari, photo
// picker) covering the app, which leaves only the application node, and a
// hit in the banner strip is springboard's notification banner.
function snapshot(simulatorId: string): Node[] {
  const [app] = JSON.parse(axe(['describe-ui'], simulatorId)) as Node[]
  const frame = app.frame!
  const probe = (x: number, y: number): Node => {
    try {
      return JSON.parse(
        axe(['describe-ui', '--point', `${Math.round(x)},${Math.round(y)}`], simulatorId)
      )
    } catch (error) {
      // axe refuses points under a system dialog, which another process owns.
      if (String(error).includes('fullscreen dialog')) return { pid: -1 }
      throw error
    }
  }
  const center = probe(frame.width / 2, frame.height / 2)
  const banner = probe(frame.width / 2, 80)
  const foreign = (node: Node) => node.pid !== undefined && node.pid !== app.pid
  // axe also repeats a text's run as a second node with the same type,
  // label, and frame; one element is one node.
  const nodes: Node[] = []
  const seen = new Set<string>()
  const visit = (node: Node): void => {
    const f = node.frame
    const key = JSON.stringify([
      node.type,
      node.AXLabel,
      node.AXUniqueId,
      f && [f.x, f.y, f.width, f.height],
    ])
    if (!seen.has(key)) {
      seen.add(key)
      nodes.push(node)
    }
    for (const child of (node.children as Node[] | undefined) ?? []) visit(child)
  }
  if (foreign(center)) nodes.push({ ...app, children: [] })
  else visit(app)
  // a remote sheet reaches the banner strip too; only a third process there
  // is a banner.
  if (foreign(banner) && banner.pid !== center.pid) visit(banner)
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
// the controls fixture swaps its body per category, so the status panel differs: the value
// categories publish Value:/Request: and the focus category publishes its own focus state. the
// category row is what stays mounted in every category, so the guard leans on that and accepts
// either panel. requiring only the value panel made every focus check time out on the guard
// rather than on its own predicate.
const formsLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-control-category-toggle')) &&
  ((has(nodes, 'Value: ') && has(nodes, 'Request: ')) || has(nodes, 'Focus: '))
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
// the lifecycle probe drives a nested presenter whose buttons own the tree while it
// is up, so the fixture counts as loaded from its side of the presentation too.
const dialogsLifecycleLoaded = (nodes: Node[]) =>
  dialogsLoaded(nodes) || labels(nodes).includes('Cancel nested')
const hostLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-host-expand')) &&
  has(nodes, 'Host: ')
const containersLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-container-extra')) &&
  has(nodes, 'Form: ')
const listsLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-list-style')) &&
  has(nodes, 'List style: ')
const groupsLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-groups-refuse')) &&
  has(nodes, 'Expanded: ')
const stateLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-state-set')) &&
  has(nodes, 'Flag: ')
const safeAreaLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-safe-area-edges')) &&
  has(nodes, 'Insets: ')
const fontsLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-fonts-load')) &&
  has(nodes, 'Loaded: ')
const hapticsLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-haptics-selection')) &&
  has(nodes, 'Module: ')
const cryptoLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-crypto-regenerate')) &&
  has(nodes, 'UUID1: ')
const appInfoLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-app-info-refresh')) &&
  has(nodes, 'Version: ')
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
    has(nodes, 'Sources: ready')) ||
    Boolean(id(nodes, 'QLOverlayDoneButtonAccessibilityIdentifier')))
const mapLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-map-place-ferry')) &&
  has(nodes, 'Place: ')
// a presented document picker runs out of process: the snapshot carries only the
// application node on both snapshot paths, leaving the fixture behind it out,
// so the fixture counts as loaded from either side of the presentation.
const appleFileLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  (Boolean(id(nodes, 'one-native-apple-file-category-signin')) ||
    nodes.every((n) => n.type === 'Application'))
const clipboardLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-clipboard-set')) &&
  has(nodes, 'Written: ')
const networkLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-network-refresh')) &&
  has(nodes, 'State: ')
// a presented safari sheet takes the whole accessibility tree and exposes no
// children through this snapshot api, so the suite counts a collapsed tree
// as the presented side of loaded. home rows carry nav ids, which keeps a
// mid-navigation tree from counting.
const browserPresented = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  !labels(nodes).some((label) => label.includes('Result: ')) &&
  !nodes.some((node) => node.AXUniqueId?.startsWith('nav-'))
const browserLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  ((Boolean(id(nodes, 'one-native-browser-open')) && has(nodes, 'Result: ')) ||
    browserPresented(nodes))
const notificationsLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-notifications-permission-refresh')) &&
  has(nodes, 'Notifications: mounted')
// a presented photo picker covers the fixture and publishes no accessibility
// tree of its own, so the screen counts as loaded from the fixture side, the
// camera prompt, or the bare application node.
const imagePickerLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  ((Boolean(id(nodes, 'one-native-image-picker-library')) && has(nodes, 'Result: ')) ||
    labels(nodes).includes('Cancel') ||
    labels(nodes).includes('Don’t Allow') ||
    nodes.every((n) => n.type === 'Application'))
const uiMapLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-ui-map-place-ferry')) &&
  has(nodes, 'Zoom: ')
const gpuLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  Boolean(id(nodes, 'one-native-gpu-screen')) &&
  has(nodes, 'Triangle: ')
const popoverLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  ((Boolean(id(nodes, 'one-native-popover-open')) && has(nodes, 'Trigger: ')) ||
    Boolean(id(nodes, 'PopoverDismissRegion')) ||
    labels(nodes).includes('Popover body') ||
    labels(nodes).includes('Section body'))
// the sheet's navigation bar carries the title as its identifier, so the bar is what
// says the stack presented, and the fixture's own rows say the React side is alive.
const navigationLoaded = (nodes: Node[]) =>
  nodes.some((n) => n.type === 'Application') &&
  (Boolean(id(nodes, 'one-native-navigation-open')) ||
    Boolean(id(nodes, 'Mailbox')) ||
    labels(nodes).includes('Inbox page'))
// the fixture the suite drives, and the home row that reaches it. pickers and forms share
// one screen; tabs-menu drives the One Native hub rather than a control fixture.
const suiteLoaded: Record<Suite, (nodes: Node[]) => boolean> = {
  'tabs-menu': fixtureLoaded,
  pickers: pickersLoaded,
  forms: formsLoaded,
  sheets: sheetsLoaded,
  leaves: leavesLoaded,
  dialogs: dialogsLoaded,
  'dialogs-lifecycle': dialogsLifecycleLoaded,
  host: hostLoaded,
  containers: containersLoaded,
  lists: listsLoaded,
  groups: groupsLoaded,
  state: stateLoaded,
  'safe-area': safeAreaLoaded,
  fonts: fontsLoaded,
  haptics: hapticsLoaded,
  crypto: cryptoLoaded,
  'app-info': appInfoLoaded,
  popover: popoverLoaded,
  navigation: navigationLoaded,
  accessibility: accessibilityLoaded,
  media: mediaLoaded,
  map: mapLoaded,
  'apple-file': appleFileLoaded,
  clipboard: clipboardLoaded,
  network: networkLoaded,
  browser: browserLoaded,
  notifications: notificationsLoaded,
  'image-picker': imagePickerLoaded,
  'ui-map': uiMapLoaded,
  gpu: gpuLoaded,
}
const suiteHome: Record<Suite, string> = {
  'tabs-menu': 'nav-one-native',
  pickers: 'nav-one-native-controls',
  forms: 'nav-one-native-controls',
  sheets: 'nav-one-native-sheet',
  leaves: 'nav-one-native-leaves',
  dialogs: 'nav-one-native-dialogs',
  'dialogs-lifecycle': 'nav-one-native-dialogs',
  host: 'nav-one-native-host',
  containers: 'nav-one-native-containers',
  lists: 'nav-one-native-lists',
  groups: 'nav-one-native-groups',
  state: 'nav-one-native-state',
  'safe-area': 'nav-one-native-safe-area',
  fonts: 'nav-one-native-fonts',
  haptics: 'nav-one-native-haptics',
  crypto: 'nav-one-native-crypto',
  'app-info': 'nav-one-native-app-info',
  popover: 'nav-one-native-popover',
  accessibility: 'nav-one-native-accessibility',
  media: 'nav-one-native-media',
  map: 'nav-one-native-map',
  'apple-file': 'nav-one-native-apple-file',
  clipboard: 'nav-one-native-clipboard',
  network: 'nav-one-native-network',
  browser: 'nav-one-native-browser',
  notifications: 'nav-one-native-notifications',
  'image-picker': 'nav-one-native-image-picker',
  'ui-map': 'nav-one-native-ui-map',
  gpu: 'nav-one-native-gpu',
  navigation: 'nav-one-native-navigation',
}
const homeLoaded = (nodes: Node[], suite: Suite) => Boolean(id(nodes, suiteHome[suite]))
const firstState = (nodes: Node[]) =>
  fixtureLoaded(nodes) &&
  has(nodes, 'First tab') &&
  labels(nodes).includes('1') &&
  id(nodes, 'one-native-input-first')?.AXValue === 'Retained'

async function run(config: Config, checks: { name: string; durationMs: number }[]) {
  fs.mkdirSync(config.artifactDir, { recursive: true })
  // a RedBox replaces the whole accessibility tree, so every loaded-state assertion after one
  // times out complaining about the fixture while the real error sits on screen. its own buttons
  // identify it, and everything else it publishes is the message.
  const redBoxButtons = [
    'Dismiss (ESC)',
    'Reload (\u2318R)',
    'Copy (\u2325\u2318C)',
    'Extra Info (\u2318E)',
  ]
  const redBox = (nodes: Node[]) => {
    const found = labels(nodes)
    if (!redBoxButtons.every((button) => found.includes(button))) return undefined
    return found
      .filter((label) => !redBoxButtons.includes(label) && label !== 'OneNativeTests')
      .join(' ')
  }
  const wait = async (
    name: string,
    predicate: (nodes: Node[]) => boolean,
    home = false,
    // extra context for the timeout message, so a check that folds several steps into one
    // predicate can still say which step it was stuck on
    diagnose?: () => string
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
      const error = redBox(nodes)
      if (error) {
        screenshot(`fail-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`)
        throw new Error(`${name}: the app is showing a RedBox: ${error}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
    } while (Date.now() < deadline)
    const stem = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const snapshotPath = path.join(config.artifactDir, `fail-${stem}.json`)
    fs.writeFileSync(snapshotPath, JSON.stringify(nodes, null, 2))
    screenshot(`fail-${stem}.png`)
    const detail = diagnose?.()
    throw new Error(
      `${name} timed out after ${config.timeout}ms${detail ? `; ${detail}` : ''}; snapshot: ${snapshotPath}`
    )
  }
  // the only tap path: a physical touch down/up delivers on headless hosts,
  // where the simulator tapAt call reports success without delivering
  // anything. it goes through tap --tap-style physical because the touch
  // subcommand cannot open simulator input on some devices where this can.
  const touch = (x: number, y: number) => {
    const output = axe(
      [
        'tap',
        '-x',
        String(Math.round(x)),
        '-y',
        String(Math.round(y)),
        '--tap-style',
        'physical',
      ],
      config.simulatorId
    )
    // axe exits 0 with the dropped input connection buried in the details
    // text; surface it as the failure instead of tapping into the void.
    if (output.includes('could not establish simulator input'))
      throw new Error(
        `touch at (${Math.round(x)}, ${Math.round(y)}) failed: axe could not establish simulator input`
      )
    return output
  }
  const tap = (target: { id?: string; label?: string }) => {
    if (!target.id && !target.label) throw new Error('A tap target is required.')
    const nodes = snapshot(config.simulatorId)
    const frame = target.id
      ? id(nodes, target.id)?.frame
      : nodes.find((node) => node.AXLabel === target.label)?.frame
    if (!frame)
      throw new Error(
        `No accessibility element matched ${target.id ? `--id '${target.id}'` : `--label '${target.label}'`}.`
      )
    return touch(frame.x + frame.width / 2, frame.y + frame.height / 2)
  }
  const point = (x: number, y: number) => touch(x, y)
  // a field does not become first responder the moment the tap returns, the snapshot carries
  // no focus flag, and the attached hardware keyboard leaves no software keyboard to wait on.
  // firing the whole string blind drops the leading characters, and iOS then autocorrects what
  // is left into a different word. so the first character is the focus probe: nothing more is
  // sent until it has landed in the field.
  const typeInto = async (
    name: string,
    text: string,
    current: (nodes: Node[]) => string | number | undefined
  ) => {
    if (!text) throw new Error('typeInto requires text')
    const before = String(current(snapshot(config.simulatorId)) ?? '')
    axe(['type', text[0]], config.simulatorId)
    // a single character has no remainder to gate, and some fields are expected to reject it
    // and restore the old value, so waiting for a change there would hang on correct behavior.
    if (text.length === 1) return
    await wait(
      `${name} takes the first character`,
      (nodes) => String(current(nodes) ?? '') !== before
    )
    axe(['type', text.slice(1)], config.simulatorId)
  }
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
      // a row below the viewport needs the list pushed up, and one the swipe already
      // carried past the top needs it pulled back down: scrolling one direction only
      // walks past an overshot row and never comes back to it.
      const down = row.y < 0
      axe(
        [
          'swipe',
          '--start-x',
          String(Math.round(app.width / 2)),
          '--start-y',
          String(Math.round(app.height * (down ? 0.35 : 0.75))),
          '--end-x',
          String(Math.round(app.width / 2)),
          '--end-y',
          String(Math.round(app.height * (down ? 0.75 : 0.35))),
          '--duration',
          // a fast swipe throws the short home list its whole scrollable range and the
          // row flies past the viewport, so this scrolls at a speed that stays put.
          '0.9',
        ],
        config.simulatorId
      )
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
    throw new Error(`Could not bring ${testID} into view on the home list`)
  }
  const screenshot = (name: string, nodes = snapshot(config.simulatorId)) => {
    const target = path.join(config.artifactDir, name)
    fs.writeFileSync(
      target.replace(/\.png$/i, '.ax.json'),
      JSON.stringify(nodes, null, 2)
    )
    execFileSync('xcrun', ['simctl', 'io', config.simulatorId, 'screenshot', target], {
      stdio: 'inherit',
      timeout: 30_000,
    })
    return target
  }
  // Every positive capture waits for the declared subject measurement inside its current
  // accessibility frame. This is required for asynchronous MapKit and AVKit paint, and keeps the
  // capture contract identical for every visual check. A timeout proves the subject never reached
  // the pixel state that the offline gate claims to grade.
  const visualScreenshot = async (name: string, checkName: string) => {
    const declaration = VISUAL_CHECKS.find((check) => check.name === checkName)
    if (!declaration || path.basename(declaration.positiveCapture) !== name)
      throw new Error(`${checkName} does not declare ${name} as its positive capture`)
    const started = Date.now()
    const deadline = started + config.timeout
    let reading = 0
    do {
      const nodes = snapshot(config.simulatorId)
      const target = screenshot(name, nodes)
      const region = resolveVisualRegion(declaration, nodes)
      reading = declaration.measureSubject(extractCrop(readPng(target), region))
      if (reading >= declaration.minSubjectFloor) {
        const receipt = `${checkName} pixels are ready before capture`
        checks.push({ name: receipt, durationMs: Date.now() - started })
        console.log(`PASS ${receipt}`)
        return target
      }
      await Bun.sleep(250)
    } while (Date.now() < deadline)
    throw new Error(
      `${checkName} never reached its subject floor before capture: ${reading} < ${declaration.minSubjectFloor}`
    )
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
  // exactly one check per call. the app filters react native's debugger migration notice, so
  // seeing it here means startup configuration did not take effect and interaction is blocked.
  const dismissWarning = async (home: boolean) => {
    await wait(
      'no warning overlay intercepts interaction',
      (current) =>
        !current.some((node) => node.AXLabel?.includes('Open debugger to view warnings')),
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
        bar?.frame && app?.frame && app.frame.width === 393 && app.frame.height === 852
      )
    })
    const app = nodes.find(
      (node) =>
        node.type === 'Application' ||
        node.AXRole === 'AXApplication' ||
        node.role === 'AXApplication'
    )!
    if (app.frame!.width !== 393 || app.frame!.height !== 852)
      throw new Error(
        `Expected a 393x852 iPhone 16 display, got ${JSON.stringify(app.frame)}`
      )
    await dismissWarning(false)
    point(x, 783)
  }

  const launchApp = () =>
    execFileSync('xcrun', ['simctl', 'launch', config.simulatorId, config.bundleId], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30_000,
    })
  const stopApp = () =>
    execFileSync('xcrun', ['simctl', 'terminate', config.simulatorId, config.bundleId], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30_000,
    })

  try {
    stopApp()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // a freshly booted device has never run the app, and simctl words that differently
    if (!/not running|nothing to terminate/i.test(message)) throw error
    console.log('App was not running.')
  }
  if (config.suite === 'image-picker') {
    // reset first so reruns start undetermined like a fresh install.
    execFileSync(
      'xcrun',
      ['simctl', 'privacy', config.simulatorId, 'reset', 'camera', config.bundleId],
      { stdio: 'ignore', timeout: 30_000 }
    )
  }
  if (config.suite === 'notifications') {
    // simctl privacy has no notifications service on this xcode, so a
    // reinstall stands in for reset: it returns permission to undetermined.
    if (!config.appPath)
      throw new Error('The notifications suite requires --app-path for a fresh install.')
    execFileSync('xcrun', ['simctl', 'uninstall', config.simulatorId, config.bundleId], {
      stdio: 'ignore',
      timeout: 30_000,
    })
    execFileSync('xcrun', ['simctl', 'install', config.simulatorId, config.appPath], {
      stdio: 'ignore',
      timeout: 60_000,
    })
  }
  // RCT_jsLocation in the app's defaults is how a non-default packager port
  // reaches the app; without it the app keeps the baked localhost:8081. it is
  // persisted rather than passed as a launch argument so that launches the
  // runner does not make (a notification tap on a terminated app) load it too.
  // written after the notifications reinstall, which clears the container.
  if (config.jsLocation)
    execFileSync(
      'xcrun',
      [
        'simctl',
        'spawn',
        config.simulatorId,
        'defaults',
        'write',
        config.bundleId,
        'RCT_jsLocation',
        config.jsLocation,
      ],
      { stdio: 'ignore', timeout: 30_000 }
    )
  launchApp()
  if (config.suite === 'sheets') {
    let expectedCount = 1
    const retained = (nodes: Node[]) =>
      id(nodes, 'one-native-sheet-counter')?.AXLabel === String(expectedCount) &&
      id(nodes, 'one-native-sheet-input')?.AXValue === 'Retained'
    const sheetContentHasGeometry = (nodes: Node[], yPixels: number) => {
      const frame = nodes.find(
        (node) => node.type === 'StaticText' && node.AXLabel === 'Sheet Content'
      )?.frame
      return (
        Math.round((frame?.x ?? 0) * 3) === 59 &&
        Math.round((frame?.y ?? 0) * 3) === yPixels &&
        Math.round((frame?.width ?? 0) * 3) === 1062 &&
        Math.round((frame?.height ?? 0) * 3) === 56
      )
    }
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
      touch(frame.x + frame.width / 2, frame.y + frame.height / 2)
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
      axe(
        [
          'swipe',
          '--start-x',
          String(Math.round(app.width / 2)),
          '--start-y',
          String(Math.round(frame.y - 7)),
          '--end-x',
          String(Math.round(app.width / 2)),
          '--end-y',
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
    await visualScreenshot('sheet-open.png', 'sheet-presentation-paints')
    tap({ id: 'one-native-sheet-increment' })
    await wait(
      'RN sheet button receives touch',
      (n) => id(n, 'one-native-sheet-counter')?.AXLabel === '1'
    )
    tap({ id: 'one-native-sheet-input' })
    await typeInto(
      'RN sheet input',
      'retained',
      (n) => id(n, 'one-native-sheet-input')?.AXValue
    )
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
      'height detent preserves RN state at its exact native position',
      (n) =>
        retained(n) && has(n, 'Detents: height300') && sheetContentHasGeometry(n, 1605)
    )
    screenshot('sheet-height.png')
    tap({ id: 'one-native-sheet-close' })
    await wait('height sheet closes after its exact native frame was observed', (n) =>
      closed(n, 2)
    )
    await blockDismiss('1')
    tap({ id: 'one-native-sheet-open' })
    await wait('blocked sheet open', retained)
    await dragSheet()
    tap({ id: 'one-native-sheet-increment' })
    await wait(
      'blocked drag leaves the sheet present and interactive',
      (n) =>
        id(n, 'one-native-sheet-counter')?.AXLabel === '2' &&
        id(n, 'one-native-sheet-input')?.AXValue === 'Retained'
    )
    expectedCount = 2
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
    await wait(
      'medium sheet reopens with retained state at its exact native position',
      (n) => retained(n) && sheetContentHasGeometry(n, 1246)
    )
    tap({ id: 'one-native-sheet-close' })
    await wait('medium sheet closes after its exact native frame was observed', (n) =>
      closed(n, 5)
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
        sheetContentHasGeometry(n, 1246) &&
        Boolean(id(n, 'one-native-sheet-close'))
    )
    tap({ id: 'one-native-sheet-close' })
    await wait('recycled sheet closes after restoring the exact medium frame', (n) =>
      closed(n, 1)
    )
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'forms') {
    const nativeValue = (nodes: Node[], label: string, expected: string | number) =>
      nodes.some((n) => n.AXLabel === label && String(n.AXValue) === String(expected))
    // the native TextField publishes no AXLabel, so its testID is the only handle on its value.
    // matching on AXLabel found nothing, which made the typing probe unable to observe the
    // character it had just sent, so the check could never pass rather than never fail.
    const typeField = (name: string, testID: string, text: string) =>
      typeInto(name, text, (n) => id(n, testID)?.AXValue)
    const submit = () => axe(['key', '40'], config.simulatorId)
    const pressSwitch = async () => {
      const nodes = await wait('native switch is ready', (n) =>
        Boolean(n.find((x) => x.AXLabel === 'Enable notifications' && x.frame))
      )
      const frame = nodes.find((n) => n.AXLabel === 'Enable notifications')!.frame!
      // iOS switch tracking needs a physical press; an instantaneous HID tap never begins tracking.
      touch(frame.x + frame.width - 25, frame.y + frame.height / 2)
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
    await visualScreenshot('toggle-rejected.png', 'toggle-control')
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
    tap({ id: 'one-native-control-reject' })
    await wait(
      'stepper stays at the upper bound through a later React action',
      (n) =>
        value(n, '10') &&
        request(n, '10') &&
        has(n, 'Reject: on') &&
        nativeValue(n, 'Guests, Increment', '10')
    )
    tap({ id: 'one-native-control-reject' })
    await wait('stepper rejection mode clears', (n) => has(n, 'Reject: off'))
    tap({ label: 'Guests, Decrement' })
    await wait(
      'stepper decrements from upper bound',
      (n) => value(n, '9') && request(n, '9') && nativeValue(n, 'Guests, Increment', '9')
    )
    await visualScreenshot('stepper-enabled.png', 'stepper-control')
    tap({ id: 'one-native-control-category-slider' })
    const nodes = await wait(
      'slider mounted',
      (n) => value(n, '25') && nativeValue(n, 'Volume', 0.25)
    )
    const frame = nodes.find((n) => n.AXLabel === 'Volume')!.frame!
    axe(
      [
        'swipe',
        '--start-x',
        String(Math.round(frame.x + frame.width * 0.25)),
        '--start-y',
        String(Math.round(frame.y + frame.height / 2)),
        '--end-x',
        String(Math.round(frame.x + frame.width - 1)),
        '--end-y',
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
    axe(
      [
        'swipe',
        '--start-x',
        String(Math.round(frame.x + frame.width * 0.5)),
        '--start-y',
        String(Math.round(frame.y + frame.height / 2)),
        '--end-x',
        String(Math.round(frame.x + frame.width - 1)),
        '--end-y',
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
    await visualScreenshot('form-controls.png', 'slider-control')
    tap({ id: 'one-native-control-category-focus' })
    await wait(
      'focus controls mounted',
      (n) => has(n, 'Focus: none') && Boolean(id(n, 'one-native-focus-programmatic-1'))
    )
    tap({ id: 'one-native-focus-programmatic-1' })
    await wait('focus field one programmatically', (n) => has(n, 'Focus: field1'))
    await typeField('Field 1', 'one-native-focus-field-1', 'First')
    await wait('field one received text', (n) => has(n, 'Field 1: First'))
    submit()
    await wait(
      'submit advances focus to field two',
      (n) => has(n, 'Focus: field2') && has(n, 'Submits: 1')
    )
    await typeField('Field 2', 'one-native-focus-field-2', 'Second')
    await wait('field two received text', (n) => has(n, 'Field 2: Second'))
    submit()
    await wait(
      'submit field two drops focus',
      (n) => has(n, 'Focus: none') && has(n, 'Submits: 2')
    )
    tap({ id: 'one-native-focus-programmatic-numeric' })
    await wait('numeric field focused', (n) => has(n, 'Focus: numeric'))
    await typeField('Numeric', 'one-native-focus-field-numeric', '12345')
    await wait('numeric field received text', (n) => has(n, 'Numeric: 12345'))
    tap({ id: 'one-native-focus-blur' })
    await wait('blur drops numeric focus', (n) => has(n, 'Focus: none'))
    screenshot('form-focus-chain.png')
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
    // the software one, so `type` probes with its first character rather than assuming the
    // tap already made the field first responder.
    const focus = async (secure = false) => {
      const nodes = await wait('editable native field mounted', (n) =>
        Boolean(field(n, secure)?.frame)
      )
      const bounds = field(nodes, secure)!.frame!
      point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    }
    const type = (text: string, secure = false) =>
      typeInto(
        secure ? 'SecureField' : 'TextField',
        text,
        (n) => field(n, secure)?.AXValue
      )
    const submit = () => axe(['key', '40'], config.simulatorId)
    const indicator = (nodes: Node[], testID: string) =>
      nodes.filter((node) => node.AXUniqueId === testID)
    const captureIndicator = (name: string, nodes: Node[]) => {
      // Save the exact native values beside the screenshot. The value-step assertion now
      // requires these values to exist and change; a fixture-only update cannot pass it.
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
      if (style === 'borderedProminent')
        await visualScreenshot('button-borderedProminent.png', 'button-prominent-style')
      else screenshot(`button-${style}.png`)
    }
    tap({ id: 'one-native-leaf-toggle-role' })
    await wait(
      'Button role cleared',
      (n) => status(n, 'Role', 'unset') && status(n, 'Presses', 5)
    )

    for (const category of ['Progress', 'Gauge'] as const) {
      const nativeID = `one-native-leaf-${category.toLowerCase()}`
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
        const before = indicator(previous, nativeID)
          .map((n) => n.AXValue)
          .filter((v) => v !== undefined && v !== '')
          .map(String)
        tap({ id: 'one-native-leaf-step' })
        previous = await wait(`${category} value ${next}`, (n) => {
          if (!value(n, String(next))) return false
          // when a native value is exposed, require an actual native change as well.
          const after = indicator(n, nativeID)
            .map((x) => x.AXValue)
            .filter((v) => v !== undefined && v !== '')
            .map(String)
          return after.length > 0 && JSON.stringify(after) !== JSON.stringify(before)
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
          indicator(n, nativeID).filter((x) => String(x.AXValue ?? '').endsWith('%'))
        await wait('Progress determinate reports a percentage', (n) =>
          Boolean(percentage(n).length)
        )
        tap({ id: 'one-native-leaf-indeterminate' })
        const nodes = await wait(
          'Progress indeterminate drops the determinate percentage',
          (n) =>
            value(n, 'indeterminate') &&
            indicator(n, nativeID).length > 0 &&
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
    await type('leaf')
    await wait(
      'TextField accepts exact text',
      (n) => value(n, 'leaf') && request(n, 'leaf') && field(n)?.AXValue === 'leaf'
    )
    tap({ id: 'one-native-leaf-reject' })
    await wait('TextField rejection enabled', (n) => status(n, 'Reject', 'on'))
    await focus()
    // one character makes the rejected request independent of per-keystroke rollback.
    await type('x')
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
    await type('submit')
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
    await type('s3cr3t', true)
    await wait(
      'SecureField commits exact secret and masks every character',
      (n) =>
        value(n, 'codes:115,51,99,114,51,116') &&
        request(n, 'codes:115,51,99,114,51,116') &&
        field(n, true)?.AXValue === '\u2022'.repeat(6) &&
        !JSON.stringify(n).includes('s3cr3t')
    )
    await visualScreenshot('secure-masked.png', 'secure-field-bullets')
    submit()
    await wait(
      'SecureField emits exactly one submit',
      (n) =>
        status(n, 'Submits', 1) &&
        value(n, 'codes:115,51,99,114,51,116') &&
        !JSON.stringify(n).includes('s3cr3t')
    )

    tap({ id: 'one-native-leaf-category-image' })
    await wait(
      'fresh Image mounted',
      (n) =>
        status(n, 'Category', 'Image') &&
        status(n, 'SystemName', 'star.fill') &&
        status(n, 'RenderingMode', 'monochrome') &&
        status(n, 'Variant', 'none') &&
        status(n, 'Scale', 'medium') &&
        status(n, 'VariableValue', 'unset') &&
        n.some((x) => x.AXLabel === 'Leaf image')
    )
    screenshot('image-initial.png')
    // each of these values converts in Swift through a generated converter that fails loudly on
    // an unknown case, so walking a whole cycle exercises every conversion rather than the first
    // one. one tap per assertion also pins the order the fixture declares.
    for (const mode of ['hierarchical', 'palette', 'multicolor', 'monochrome']) {
      tap({ id: 'one-native-leaf-cycle-rendering-mode' })
      await wait(`Image ${mode} rendering mode`, (n) => status(n, 'RenderingMode', mode))
      screenshot(`image-rendering-${mode}.png`)
    }
    for (const variant of ['circle', 'square', 'rectangle', 'fill', 'slash', 'none']) {
      tap({ id: 'one-native-leaf-cycle-variant' })
      await wait(`Image ${variant} variant`, (n) => status(n, 'Variant', variant))
      screenshot(`image-variant-${variant}.png`)
    }
    // the status panel only reports what React holds, so scale is checked against the rendered
    // symbol instead: imageScale that never reached SwiftUI leaves the image the same size.
    const imageWidth = (nodes: Node[]) =>
      id(nodes, 'one-native-leaf-image')?.frame?.width ?? 0
    const mediumWidth = imageWidth(snapshot(config.simulatorId))
    if (!mediumWidth) throw new Error('the leaf image reported no width at medium scale')
    tap({ id: 'one-native-leaf-cycle-scale' })
    await wait(
      'Image large scale grows the symbol',
      (n) => status(n, 'Scale', 'large') && imageWidth(n) > mediumWidth
    )
    screenshot('image-large.png')
    tap({ id: 'one-native-leaf-cycle-scale' })
    await wait(
      'Image small scale shrinks the symbol',
      (n) => status(n, 'Scale', 'small') && imageWidth(n) < mediumWidth
    )
    screenshot('image-small.png')
    tap({ id: 'one-native-leaf-cycle-scale' })
    await wait(
      'Image scale returns to its exact medium width',
      (n) => status(n, 'Scale', 'medium') && imageWidth(n) === mediumWidth
    )
    tap({ id: 'one-native-leaf-toggle-systemname' })
    const speakerUnset = await wait(
      'Image speaker symbol reaches the native frame',
      (n) =>
        status(n, 'SystemName', 'speaker.wave.3') &&
        imageWidth(n) > 0 &&
        imageWidth(n) !== mediumWidth
    )
    const speakerFrame = id(speakerUnset, 'one-native-leaf-image')!.frame!
    const captureSpeakerInk = async (
      name: string,
      accepts: (ink: number) => boolean
    ): Promise<{ path: string; ink: number }> => {
      const deadline = Date.now() + config.timeout
      let ink = 0
      do {
        const nodes = snapshot(config.simulatorId)
        const target = screenshot(name, nodes)
        ink = countMatchingPixels(
          extractCrop(readPng(target), speakerFrame),
          (r, g, b) => r < 80 && g < 80 && b < 80
        )
        if (accepts(ink)) return { path: target, ink }
        await Bun.sleep(250)
      } while (Date.now() < deadline)
      throw new Error(`${name} never reached its required speaker ink state; last=${ink}`)
    }
    const speakerUnsetCapture = await captureSpeakerInk(
      'image-speaker-unset.png',
      (ink) => ink > 0
    )
    tap({ id: 'one-native-leaf-step-variable-value' })
    await wait('fixture requests Image variable value 0.5', (n) =>
      status(n, 'VariableValue', 0.5)
    )
    const speakerHalfCapture = await captureSpeakerInk(
      'image-speaker-variable-05.png',
      (ink) => ink < speakerUnsetCapture.ink
    )
    tap({ id: 'one-native-leaf-step-variable-value' })
    await wait('fixture requests Image variable value 1', (n) =>
      status(n, 'VariableValue', 1)
    )
    const speakerFullCapture = await captureSpeakerInk(
      'image-speaker-variable-1.png',
      (ink) => ink > speakerHalfCapture.ink
    )
    const variablePixels = countChangedPixels(
      speakerHalfCapture.path,
      speakerFullCapture.path,
      speakerFrame,
      8
    ).changed
    if (!variablePixels)
      throw new Error(
        `Image variable value changed ink counts without changing speaker pixels: unset=${speakerUnsetCapture.ink}, half=${speakerHalfCapture.ink}, full=${speakerFullCapture.ink}`
      )
    checks.push({
      name: 'Image variable value changes native speaker pixels',
      durationMs: 0,
    })
    console.log('PASS Image variable value changes native speaker pixels')

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
      await type(`cycle${cycle}`)
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
      tap({ id: 'one-native-leaf-category-image' })
      await wait(
        `leaves recycle ${cycle}: fresh Image state`,
        (n) =>
          status(n, 'Category', 'Image') &&
          status(n, 'SystemName', 'star.fill') &&
          n.some((x) => x.AXLabel === 'Leaf image')
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
      touch(frame.x + frame.width - 25, frame.y + frame.height / 2)
    }

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-containers')
    // a standalone leaf owns its own hosting controller and reports the height SwiftUI
    // measured, so a zero here means nothing measured at all. the Text fits one line in this
    // narrow box while the Label carries an SF Symbol and wraps onto two, which is exactly
    // what a fixed 24pt leaf height used to clip.
    await wait('standalone Text and Label report a measured height', (n) => {
      const text = box(n, 'Standalone text')?.height ?? 0
      const label = box(n, 'Standalone label')?.height ?? 0
      return text > 0 && label > text && label < text * 3
    })
    // a Form is height-greedy and reports nothing, so it has to fill its Yoga box.
    await wait(
      'a Form fills the exact box React Native gave it',
      (n) =>
        status(n, 'Form', '361 x 508') &&
        box(n, 'Details')?.width === 329 &&
        id(n, 'one-native-container-slot')?.frame?.width === 297
    )
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
      return Boolean(
        row && toggle && row.y >= toggle.y + toggle.height && row.height === 44
      )
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
    await visualScreenshot('containers-two-sections.png', 'containers-second-section')

    tap({ label: 'Section button' })
    await wait('a Button composed into a Section emits', (n) =>
      status(n, 'Section taps', 1)
    )

    // a Host inside a Section is a container composed into a container.
    await wait('a nested Host lays its children across the row', (n) => {
      const text = box(n, 'In host')
      const button = box(n, 'Host button')
      return Boolean(
        text &&
        button &&
        text.x + text.width <= button.x &&
        text.y + text.height / 2 === button.y + button.height / 2
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
  if (config.suite === 'lists') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    const control = (nodes: Node[], type: string, label: string) =>
      nodes.find((node) => node.type === type && node.AXLabel === label)
    // iOS switch tracking needs a physical press; an instantaneous HID tap never begins
    // tracking, so a composed Toggle would look like it never emitted.
    const pressSwitch = async (label: string) => {
      const nodes = await wait(`the ${label} switch is ready`, (n) =>
        Boolean(control(n, 'CheckBox', label)?.frame)
      )
      const frame = control(nodes, 'CheckBox', label)!.frame!
      touch(frame.x + frame.width - 25, frame.y + frame.height / 2)
    }
    // a swipe anchored to a visible row stays inside its own scroll view: starting one
    // on a neighboring list would scroll that instead.
    // seeks swipe at fixed coordinates inside measured viewport bands. row-anchored
    // seeks are flaky because buffer rows above/below the viewport poison anchor
    // selection: first-match drags start in a neighbor, mid-content drags exit the
    // viewport. every band below was verified by hand: one swipe observably moves
    // its container and nothing else. the loop exits when the target materializes.
    const swipeBand = async (
      band: { x1: number; y1: number; x2: number; y2: number },
      target: string
    ) => {
      for (let attempt = 0; attempt < 24; attempt++) {
        if (labels(snapshot(config.simulatorId)).includes(target)) return
        axe(
          [
            'swipe',
            '--start-x',
            String(band.x1),
            '--start-y',
            String(band.y1),
            '--end-x',
            String(band.x2),
            '--end-y',
            String(band.y2),
            '--duration',
            '0.3',
          ],
          config.simulatorId
        )
        await new Promise((resolve) => setTimeout(resolve, 400))
      }
      throw new Error(`${target} never appeared while swiping`)
    }
    const listBand = { x1: 200, y1: 550, x2: 200, y2: 450 }
    const rowsBand = { x1: 200, y1: 740, x2: 200, y2: 640 }
    const chipsBand = { x1: 280, y1: 805, x2: 120, y2: 805 }

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-lists')
    await wait(
      'a List renders rows from both sections',
      (n) =>
        labels(n).includes('Apple') &&
        labels(n).includes('Banana') &&
        labels(n).includes('Carrot') &&
        Boolean(control(n, 'CheckBox', 'Ripe'))
    )
    tap({ label: 'List button' })
    await wait('a Button composed into a List emits', (n) => status(n, 'List taps', 1))
    await pressSwitch('Ripe')
    await wait('a Toggle composed into a List emits', (n) => status(n, 'IsOn', 'true'))

    // each style change re-resolves the list style natively; the rows surviving it is
    // what proves the prop flowed without dropping the content. a style relayout can
    // shift section 2 below the fold, so section 2 is asserted after swiping it in;
    // the list is lazy, so section 1 is only asserted before that swipe.
    tap({ id: 'one-native-list-style' })
    await wait(
      'a List takes the plain style',
      (n) => status(n, 'List style', 'plain') && labels(n).includes('Apple')
    )
    await swipeBand(listBand, 'Carrot')
    await wait('a plain List keeps its second section', (n) =>
      labels(n).includes('Carrot')
    )
    tap({ id: 'one-native-list-style' })
    await wait('a List takes the grouped style', (n) =>
      status(n, 'List style', 'grouped')
    )
    await swipeBand(listBand, 'Carrot')
    await wait('a grouped List keeps its second section', (n) =>
      labels(n).includes('Carrot')
    )
    screenshot('lists-grouped.png')

    // the first lazy rows mount; the last ones must not, because a LazyVStack that
    // built all thirty up front would be a VStack with extra steps.
    await wait('a LazyVStack mounts its first rows', (n) => labels(n).includes('Row 1'))
    if (labels(snapshot(config.simulatorId)).includes('Row 30'))
      throw new Error('a LazyVStack mounted rows it cannot show yet')
    await swipeBand(rowsBand, 'Row 30')
    await wait('scrolling a LazyVStack materializes its last rows', (n) =>
      labels(n).includes('Row 30')
    )

    await wait('a LazyHStack mounts its first chips', (n) => labels(n).includes('Chip 1'))
    if (labels(snapshot(config.simulatorId)).includes('Chip 20'))
      throw new Error('a LazyHStack mounted chips it cannot show yet')
    await swipeBand(chipsBand, 'Chip 20')
    await wait('scrolling a LazyHStack materializes its last chips', (n) =>
      labels(n).includes('Chip 20')
    )
    screenshot('lists-scrolled.png')

    for (const cycle of [1, 2]) {
      tap({ label: 'index' })
      await wait(`lists recycle ${cycle}: home mounted`, () => true, true)
      await tapNav('nav-one-native-lists')
      await wait(
        `lists recycle ${cycle}: a fresh List rebuilds`,
        (n) =>
          status(n, 'IsOn', 'false') &&
          status(n, 'List taps', 0) &&
          labels(n).includes('Apple')
      )
      await pressSwitch('Ripe')
      await wait(`lists recycle ${cycle}: the composed Toggle still emits`, (n) =>
        status(n, 'IsOn', 'true')
      )
    }
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'groups') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    const box = (nodes: Node[], label: string) =>
      nodes.find((node) => node.AXLabel === label && node.frame)?.frame
    // a short horizontal swipe over a frame: reveals swipe actions or turns a pager
    // page without travelling far enough to trigger a full swipe.
    const swipeOver = (
      frame: { x: number; y: number; width: number; height: number },
      left: boolean
    ) => {
      const x = Math.round(frame.x + frame.width / 2)
      const y = Math.round(frame.y + frame.height / 2)
      axe(
        [
          'swipe',
          '--start-x',
          String(left ? x + 40 : x - 40),
          '--start-y',
          String(y),
          '--end-x',
          String(left ? x - 40 : x + 40),
          '--end-y',
          String(y),
          '--duration',
          '0.3',
        ],
        config.simulatorId
      )
    }
    // the icon-only button is a button frame holding an image frame. its label is
    // whatever SwiftUI derives from the symbol, so the lookup is geometric: the
    // image whose frame sits inside a button frame.
    const iconButton = (nodes: Node[]) => {
      const image = nodes.find(
        (node) =>
          node.type === 'Image' &&
          node.frame &&
          nodes.some(
            (other) =>
              other.type === 'Button' &&
              other.frame &&
              node.frame!.x >= other.frame.x &&
              node.frame!.y >= other.frame.y &&
              node.frame!.x + node.frame!.width <= other.frame.x + other.frame.width &&
              node.frame!.y + node.frame!.height <= other.frame.y + other.frame.height
          )
      )
      const button = nodes.find(
        (node) =>
          node.type === 'Button' &&
          node.frame &&
          image?.frame &&
          image.frame.x >= node.frame.x &&
          image.frame.y >= node.frame.y &&
          image.frame.x + image.frame.width <= node.frame.x + node.frame.width &&
          image.frame.y + image.frame.height <= node.frame.y + node.frame.height
      )
      if (!image?.frame || !button?.frame) return undefined
      return { image: image.frame, button: button.frame }
    }

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-groups')
    await wait(
      'groups, links, dividers, and overlays render their content',
      (n) =>
        labels(n).includes('Details') &&
        labels(n).includes('Above') &&
        labels(n).includes('Below') &&
        labels(n).includes('Visit example') &&
        labels(n).includes('Grouped') &&
        labels(n).includes('3') &&
        labels(n).includes('Swipe me')
    )

    tap({ label: 'Add' })
    await wait('a Button composed into a ControlGroup emits', (n) =>
      status(n, 'Group taps', 1)
    )

    tap({ label: 'Details' })
    await wait(
      'a DisclosureGroup expands and emits',
      (n) => status(n, 'Expanded', 'true') && labels(n).includes('Hidden detail')
    )
    // refusing the collapse in React rolls the native value back and keeps the
    // content disclosed, the container case of the controlled protocol.
    tap({ id: 'one-native-groups-refuse' })
    tap({ label: 'Details' })
    await wait(
      'a refused collapse rolls back to expanded',
      (n) => status(n, 'Expanded', 'true') && labels(n).includes('Hidden detail')
    )
    tap({ id: 'one-native-groups-refuse' })
    tap({ label: 'Details' })
    await wait(
      'an accepted collapse hides the content',
      (n) => status(n, 'Expanded', 'false') && !labels(n).includes('Hidden detail')
    )

    await wait(
      'a Pager mounts on its selection',
      (n) => status(n, 'Pager', 'a') && Boolean(id(n, 'one-native-pager-a')?.frame)
    )
    {
      const nodes = await wait('a pager page is ready to swipe', (n) =>
        Boolean(id(n, 'one-native-pager-a')?.frame)
      )
      swipeOver(id(nodes, 'one-native-pager-a')!.frame!, true)
    }
    await wait(
      'swiping a Pager selects the next page',
      (n) => status(n, 'Pager', 'b') && Boolean(id(n, 'one-native-pager-b')?.frame)
    )
    {
      const nodes = await wait('the second pager page is ready', (n) =>
        Boolean(id(n, 'one-native-pager-b')?.frame)
      )
      swipeOver(id(nodes, 'one-native-pager-b')!.frame!, false)
    }
    await wait('swiping back selects the first page again', (n) =>
      status(n, 'Pager', 'a')
    )

    {
      const nodes = await wait('a swipe row is ready', (n) => Boolean(box(n, 'Swipe me')))
      swipeOver(box(nodes, 'Swipe me')!, true)
    }
    await wait('swiping a row reveals its trailing actions', (n) =>
      labels(n).includes('Delete')
    )
    tap({ label: 'Delete' })
    await wait('a trailing swipe action emits', (n) => status(n, 'Delete taps', 1))
    {
      const nodes = await wait('the row is ready again', (n) =>
        Boolean(box(n, 'Swipe me'))
      )
      swipeOver(box(nodes, 'Swipe me')!, false)
    }
    await wait('swiping back reveals its leading actions', (n) =>
      labels(n).includes('Pin')
    )
    tap({ label: 'Pin' })
    await wait('a leading swipe action emits', (n) => status(n, 'Pin taps', 1))

    // an icon-only button renders the bare image with no title spacing reserved, so
    // the symbol sits at the center of the button frame.
    await wait('an icon-only button centers its symbol', (n) => {
      const found = iconButton(n)
      if (!found) return false
      const { image, button } = found
      const dx = image.x + image.width / 2 - (button.x + button.width / 2)
      const dy = image.y + image.height / 2 - (button.y + button.height / 2)
      return Math.abs(dx) <= 1 && Math.abs(dy) <= 1
    })
    {
      const found = iconButton(snapshot(config.simulatorId))
      if (!found) throw new Error('no image found inside a button frame')
      const { button } = found
      point(button.x + button.width / 2, button.y + button.height / 2)
    }
    await wait('an icon-only button emits', (n) => status(n, 'Icon taps', 1))
    screenshot('groups-icon-button.png')

    for (const cycle of [1, 2]) {
      tap({ label: 'index' })
      await wait(`groups recycle ${cycle}: home mounted`, () => true, true)
      await tapNav('nav-one-native-groups')
      await wait(
        `groups recycle ${cycle}: a fresh screen rebuilds`,
        (n) =>
          status(n, 'Expanded', 'false') &&
          status(n, 'Group taps', 0) &&
          status(n, 'Pager', 'a') &&
          labels(n).includes('Swipe me')
      )
    }
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'state') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    const control = (nodes: Node[], type: string, label: string) =>
      nodes.find((node) => node.type === type && node.AXLabel === label)
    // iOS switch tracking needs a physical press; an instantaneous HID tap never begins
    // tracking, so a shared Toggle would look like it never emitted.
    const pressSwitch = async (label: string) => {
      const nodes = await wait(`the ${label} switch is ready`, (n) =>
        Boolean(control(n, 'CheckBox', label)?.frame)
      )
      const frame = control(nodes, 'CheckBox', label)!.frame!
      touch(frame.x + frame.width - 25, frame.y + frame.height / 2)
    }
    const fieldValue = (nodes: Node[]) => id(nodes, 'one-native-state-field')?.AXValue

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-state')
    await wait(
      'a shared handle feeds a field, a mirror, and two toggles',
      (n) =>
        labels(n).includes('Mirror: empty') &&
        Boolean(control(n, 'CheckBox', 'First')) &&
        Boolean(control(n, 'CheckBox', 'Second')) &&
        status(n, 'Flag', 'false')
    )

    // typing in the field updates the mirror through the one handle, with no other
    // state in the fixture.
    {
      const nodes = await wait('the shared field is ready', (n) =>
        Boolean(id(n, 'one-native-state-field')?.frame)
      )
      const bounds = id(nodes, 'one-native-state-field')!.frame!
      point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    }
    await typeInto('shared TextField', 'ada', fieldValue)
    await wait(
      'field edits reach every view on the handle',
      (n) => fieldValue(n) === 'ada' && labels(n).includes('Mirror: ada')
    )

    // writing from JavaScript lands in the native field and the mirror together.
    tap({ id: 'one-native-state-set' })
    await wait(
      'a handle write reaches the native field',
      (n) =>
        fieldValue(n) === 'grace' &&
        labels(n).includes('Mirror: grace') &&
        status(n, 'Flag', 'true')
    )

    // each flip proves the tapped toggle had converged on the shared value: turning
    // Second off proves it followed First on, and turning First on proves it
    // followed Second off.
    await pressSwitch('Second')
    await wait('the second toggle followed the shared value on', (n) =>
      status(n, 'Flag', 'false')
    )
    await pressSwitch('First')
    await wait('the first toggle followed the shared value off', (n) =>
      status(n, 'Flag', 'true')
    )
    screenshot('state-shared.png')

    for (const cycle of [1, 2]) {
      tap({ label: 'index' })
      await wait(`state recycle ${cycle}: home mounted`, () => true, true)
      await tapNav('nav-one-native-state')
      await wait(
        `state recycle ${cycle}: a fresh handle starts over`,
        (n) => status(n, 'Flag', 'false') && labels(n).includes('Mirror: empty')
      )
    }
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'safe-area') {
    const numbers = (label: string | undefined, prefix: string) => {
      if (!label?.startsWith(prefix)) return null
      const values = label
        .slice(prefix.length)
        .split(/[\sx]+/)
        .map(Number)
      if (values.some((value) => !Number.isFinite(value))) return null
      return values
    }
    const labelStarting = (nodes: Node[], prefix: string) =>
      labels(nodes).find((label) => label.startsWith(prefix))
    const insetsOf = (nodes: Node[]) =>
      numbers(labelStarting(nodes, 'Insets: '), 'Insets: ')
    const frameOf = (nodes: Node[]) => numbers(labelStarting(nodes, 'Frame: '), 'Frame: ')

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-safe-area')

    // below the Stack header the provider overlaps no status bar, so the
    // correct reading is top 0 with the live home indicator at the bottom.
    // top 0 is the money assertion: a window reading would report 59, so 0
    // proves provider-relative measurement, and 34 proves a live inset
    // rather than the zero fallback. frame is the full width below the
    // header on the pinned iPhone 16.
    await wait('the provider publishes live insets', (n) => {
      const insets = insetsOf(n)
      return Boolean(
        insets &&
        insets.length === 4 &&
        insets[0] === 0 &&
        insets[1] === 0 &&
        insets[2] === 34 &&
        insets[3] === 0
      )
    })
    await wait('frame and initial metrics are published', (n) => {
      const frame = frameOf(n)
      return (
        Boolean(frame && frame.length === 2 && frame[0] === 393 && frame[1] === 739) &&
        labels(n).includes('Initial: set')
      )
    })

    // the edges toggle reaches the view and back.
    tap({ id: 'one-native-safe-area-edges' })
    await wait('the edges toggle reaches the view', (n) =>
      labels(n).includes('Edges: top')
    )
    tap({ id: 'one-native-safe-area-edges' })
    await wait('toggling back restores all edges', (n) =>
      labels(n).includes('Edges: all')
    )
    screenshot('safe-area-insets.png')

    for (const cycle of [1, 2]) {
      tap({ label: 'index' })
      await wait(`safe-area recycle ${cycle}: home mounted`, () => true, true)
      await tapNav('nav-one-native-safe-area')
      await wait(`safe-area recycle ${cycle}: insets publish again`, (n) => {
        const insets = insetsOf(n)
        const frame = frameOf(n)
        return (
          Boolean(
            insets && insets[0] === 0 && insets[2] === 34 && frame && frame[0] === 393
          ) && labels(n).includes('Initial: set')
        )
      })
    }
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'fonts') {
    const labelStarting = (nodes: Node[], prefix: string) =>
      labels(nodes).find((label) => label.startsWith(prefix))

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-fonts')

    // the name is unknown until load runs: false before is the money
    // assertion, because a JS mirror or a stale registry would read true.
    await wait('the font starts unloaded', (n) => labels(n).includes('Loaded: false'))
    await wait('dev fonts resolve over http', (n) =>
      Boolean(labelStarting(n, 'Uri: http'))
    )
    // the hook loads its own font on mount; the baseline captures wait
    // for it so no in-flight paint can move pixels between them.
    await wait('hook settles before pixel baseline', (n) =>
      labels(n).includes('Hook: loaded')
    )

    // the A sample carries no testID (RN Text IDs vanish from the
    // snapshot), so the pixel region anchors on its exact label. the same
    // region grades every capture, so the negative cannot choose a more
    // convenient crop.
    const sampleNodes = snapshot(config.simulatorId).filter(
      (node) => node.AXLabel === 'A' && node.frame
    )
    if (sampleNodes.length !== 1 || !sampleNodes[0].frame) {
      throw new Error(
        `fonts pixel gate: expected exactly one framed A sample, found ${JSON.stringify(sampleNodes.map(({ type, frame }) => ({ type, frame })))}`
      )
    }
    const sampleFrame = sampleNodes[0].frame
    const beforeLoad = screenshot('fonts-sample-before.png')
    const skippedLoad = screenshot('fonts-sample-noload.png')
    const negativePixels = countChangedPixels(beforeLoad, skippedLoad, sampleFrame, 8)
    if (negativePixels.changed !== 0) {
      throw new Error(
        `fonts pixel gate: skipped load moved ${negativePixels.changed} sample pixels, expected 0`
      )
    }

    tap({ id: 'one-native-fonts-load' })
    await wait('load flips isLoaded and the hook follows', (n) =>
      Boolean(
        labels(n).includes('Loaded: true') &&
        labels(n).includes('Status: loaded') &&
        labels(n).includes('Hook: loaded')
      )
    )
    // the sample A is a solid block no system font has; the pixels prove
    // the PostScript name resolves after load.
    const afterLoad = screenshot('fonts-loaded.png')
    const positivePixels = countChangedPixels(beforeLoad, afterLoad, sampleFrame, 8)
    if (positivePixels.changed === 0) {
      throw new Error(
        'fonts pixel gate: load flipped isLoaded without changing sample pixels'
      )
    }

    // negative control: the same file under a wrong key. iOS rejects
    // because the name never becomes usable; Android registers silently
    // (Typeface has no name query) and its flow asserts that instead.
    tap({ id: 'one-native-fonts-negative' })
    await wait('a wrong key rejects without becoming usable', (n) =>
      Boolean(
        labels(n).includes('Negative: rejected') &&
        labels(n).includes('NegativeLoaded: false') &&
        labelStarting(
          n,
          'NegativeError: Fonts.load: "OneNativeTestFont-Nope" is not usable after ' +
            'registration (expected the PostScript name, file provides OneNativeTestFont-Regular)'
        )
      )
    )
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'haptics') {
    // presence: the native module resolved. tap-through: every verb crosses
    // the bridge and records into Last. no-redbox comes from the shared wait,
    // which throws on a RedBox before any predicate can pass. the Error: none
    // wait is the console-error sweep: any js throw during the taps lands in
    // the fixture's error label instead of passing silently.
    const verbs = [
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
    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-haptics')
    await wait('the haptics module is present', (n) =>
      labels(n).includes('Module: available')
    )
    for (const verb of verbs) {
      tap({ id: `one-native-haptics-${verb}` })
      await wait(`tapping ${verb} reaches the native module`, (n) =>
        labels(n).includes(`Last: ${verb}`)
      )
    }
    await wait('no tap raised a js error', (n) => labels(n).includes('Error: none'))
    screenshot('haptics-verbs.png')

    for (const cycle of [1, 2]) {
      tap({ label: 'index' })
      await wait(`haptics recycle ${cycle}: home mounted`, () => true, true)
      await tapNav('nav-one-native-haptics')
      await wait(`haptics recycle ${cycle}: the module is present again`, (n) =>
        labels(n).includes('Module: available')
      )
    }
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'app-info') {
    // exact stamped values from the fixture manifest (9.9.9/4242), proving
    // prebuild-to-runtime plumbing rather than template defaults. the
    // refresh tap proves the screen is live; no-redbox rides in the shared
    // wait, which throws on a RedBox before any predicate can pass.
    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-app-info')
    await wait('version matches the stamped manifest', (n) =>
      labels(n).includes('Version: 9.9.9')
    )
    await wait('build matches the stamped manifest', (n) =>
      labels(n).includes('Build: 4242')
    )
    await wait('application id matches the ios bundle id', (n) =>
      labels(n).includes('ApplicationId: dev.vxrn.native.tests')
    )
    tap({ id: 'one-native-app-info-refresh' })
    await wait('the screen answers taps', (n) => labels(n).includes('Taps: 1'))
    screenshot('app-info-values.png')

    for (const cycle of [1, 2]) {
      tap({ label: 'index' })
      await wait(`app-info recycle ${cycle}: home mounted`, () => true, true)
      await tapNav('nav-one-native-app-info')
      await wait(
        `app-info recycle ${cycle}: stamped values return`,
        (n) =>
          labels(n).includes('Version: 9.9.9') &&
          labels(n).includes('Build: 4242') &&
          labels(n).includes('ApplicationId: dev.vxrn.native.tests')
      )
    }
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'crypto') {
    // presence: the native module resolved. validity: two uuids off the
    // device match rfc 4122 v4 and differ, and the getRandomValues fill is
    // 16 bytes of hex. no-redbox comes from the shared wait, which throws
    // on a RedBox before any predicate can pass, and the Error: none wait
    // is the js-throw sweep: any crypto failure lands in the error label.
    const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    const hex32 = /^[0-9a-f]{32}$/
    const valueOf = (nodes: Node[], prefix: string) =>
      labels(nodes)
        .find((label) => label.startsWith(prefix))
        ?.slice(prefix.length)
    const cryptoValid = (nodes: Node[]) => {
      const first = valueOf(nodes, 'UUID1: ')
      const second = valueOf(nodes, 'UUID2: ')
      const random = valueOf(nodes, 'Random: ')
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
    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-crypto')
    await wait('the crypto module is present', (n) =>
      labels(n).includes('Module: available')
    )
    await wait('two distinct valid uuids render on device', cryptoValid)
    await wait('no crypto call raised a js error', (n) =>
      labels(n).includes('Error: none')
    )
    tap({ id: 'one-native-crypto-regenerate' })
    await wait('regenerated uuids stay valid and distinct', cryptoValid)
    await wait('regeneration raised no js error', (n) =>
      labels(n).includes('Error: none')
    )
    screenshot('crypto-uuids.png')

    for (const cycle of [1, 2]) {
      tap({ label: 'index' })
      await wait(`crypto recycle ${cycle}: home mounted`, () => true, true)
      await tapNav('nav-one-native-crypto')
      await wait(`crypto recycle ${cycle}: uuids render again`, (n) => {
        const valid = cryptoValid(n)
        return valid && labels(n).includes('Error: none')
      })
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
      axe(
        [
          'swipe',
          '--start-x',
          String(Math.round(frame.width / 2)),
          '--start-y',
          String(Math.round(frame.height * 0.2)),
          '--end-x',
          String(Math.round(frame.width / 2)),
          '--end-y',
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
    await wait('the trigger lays out inline and reports its measured height', (n) => {
      const frame = control(n, 'Button', 'Trigger')?.frame
      return (
        status(n, 'Trigger', triggerHeight) &&
        Math.round(frame?.height ?? 0) === triggerHeight &&
        status(n, 'Open', 'false') &&
        !labels(n).includes('Popover body')
      )
    })
    screenshot('popover-closed.png')

    tap({ id: 'one-native-popover-open' })
    await wait('React presents the popover', (n) => labels(n).includes('Popover body'))
    await visualScreenshot('popover-open.png', 'popover-balloon')

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
      await wait(`popover recycle ${cycle}: a fresh trigger measures`, (n) => {
        const frame = control(n, 'Button', 'Trigger')?.frame
        return (
          status(n, 'Trigger', triggerHeight) &&
          Math.round(frame?.height ?? 0) === triggerHeight &&
          status(n, 'Open', 'false') &&
          status(n, 'Taps', 0)
        )
      })
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
  if (config.suite === 'navigation') {
    const text = (nodes: Node[], expected: string) => labels(nodes).includes(expected)
    // the bar is a Group whose identifier is the navigationTitle, and the segmented
    // Picker inside it is a native segmented control: iOS exposes each segment as a
    // RadioButton, with 1 on the selected one.
    const segment = (nodes: Node[], label: string) =>
      nodes.find((node) => node.type === 'RadioButton' && node.AXLabel === label)
    const tapSegment = (label: string) => {
      const node = segment(snapshot(config.simulatorId), label)
      if (!node?.frame) throw new Error(`No segmented control segment ${label}`)
      touch(node.frame.x + node.frame.width / 2, node.frame.y + node.frame.height / 2)
    }

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-navigation')
    await wait(
      'the fixture mounts',
      (n) => text(n, 'Page: inbox') && text(n, 'Closes: 0')
    )

    tap({ id: 'one-native-navigation-open' })
    // the native bar: the title, the principal segmented control, and the trailing close.
    await wait('the stack presents a real navigation bar with the title', (n) => {
      return (
        Boolean(id(n, 'Mailbox')) &&
        text(n, 'Inbox page') &&
        String(segment(n, 'Inbox')?.AXValue) === '1' &&
        String(segment(n, 'Archive')?.AXValue) === '0' &&
        Boolean(n.find((node) => node.type === 'Button' && node.AXLabel === 'Close'))
      )
    })
    screenshot('navigation-bar.png')

    // the principal Picker is a composed SwiftUI control, so this proves its controlled
    // selection crosses back into React and re-renders the React Native page under the bar.
    tapSegment('Archive')
    await wait('the principal picker drives the React Native page', (n) => {
      return (
        text(n, 'Archive page') &&
        text(n, 'Page: archive') &&
        String(segment(n, 'Archive')?.AXValue) === '1'
      )
    })
    screenshot('navigation-archive.png')

    // the React Native subtree is the stack's root, laid out in the box SwiftUI proposed,
    // so a tap has to arrive through the stack to reach it.
    tap({ id: 'one-native-navigation-tap' })
    await wait('the React Native root takes a tap', (n) => text(n, 'Taps: 1'))

    // the labelled ToolbarItemGroup's content is a real SwiftUI button too.
    tap({ label: 'Newest' })
    await wait('the toolbar group action reaches React', (n) => text(n, 'Sort: 1'))

    tap({ label: 'Close' })
    await wait('the trailing close dismisses the sheet', (n) => {
      return text(n, 'Closes: 1') && !text(n, 'Archive page')
    })

    tap({ id: 'one-native-navigation-open' })
    await wait('and it presents again with the state React holds', (n) => {
      return text(n, 'Archive page') && text(n, 'Page: archive')
    })
    screenshot('navigation-reopened.png')

    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'accessibility') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    const control = (nodes: Node[], label: string) =>
      nodes.find((node) => node.AXLabel === label)
    // iOS switch tracking needs a physical press; an instantaneous HID tap never begins
    // tracking, so a composed Toggle would look like it never emitted.
    const pressSwitch = (frame: {
      x: number
      y: number
      width: number
      height: number
    }) => touch(frame.x + frame.width - 25, frame.y + frame.height / 2)

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
    await wait('accessibility: a styled control carries its label', (n) =>
      labels(n).includes('Styled action')
    )
    await wait('accessibility: a styled control carries its testID', (n) =>
      Boolean(id(n, 'one-native-a11y-styled-button'))
    )
    await wait('accessibility: a styled toggle carries its label', (n) =>
      labels(n).includes('Styled toggle')
    )
    await wait('accessibility: a styled toggle carries its testID', (n) =>
      Boolean(id(n, 'one-native-a11y-styled-toggle'))
    )
    screenshot('a11y-short-text.png')

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
        n.find(
          (node) => node.AXUniqueId === 'one-native-a11y-composed' && node.AXValue === '1'
        )
      )
    )

    // sizing: no control declares a height any more, so these are SwiftUI's own numbers.
    nodes = snapshot(config.simulatorId)
    const shortText = id(nodes, 'one-native-a11y-text')?.frame?.height ?? 0
    const toggleHeight = id(nodes, 'one-native-a11y-standalone')?.frame?.height ?? 0
    if (!(shortText > 0))
      throw new Error(`A standalone Text measured ${shortText}, so nothing was reported`)
    if (!(toggleHeight > 0))
      throw new Error(
        `A standalone Toggle measured ${toggleHeight}, so nothing was reported`
      )
    checks.push({
      name: 'accessibility: standalone leaves report a measured height',
      durationMs: 0,
    })
    console.log('PASS accessibility: standalone leaves report a measured height')

    // the case a fixed height clipped: this paragraph cannot fit on one line.
    tap({ id: 'one-native-a11y-wrap' })
    const wrapped = await wait('accessibility: wrapping text grows its box', (n) => {
      const height = id(n, 'one-native-a11y-text')?.frame?.height
      return height !== undefined && height > shortText
    })
    const wrappedText = id(wrapped, 'one-native-a11y-text')!.frame!.height
    if (!(wrappedText > shortText * 2))
      throw new Error(
        `A paragraph that wraps onto several lines measured ${wrappedText} against ${shortText} for one line, so it is still being clipped`
      )
    checks.push({
      name: 'accessibility: a wrapped paragraph is not clipped',
      durationMs: 0,
    })
    console.log('PASS accessibility: a wrapped paragraph is not clipped')
    await visualScreenshot('a11y-wrapped-text.png', 'a11y-wrapped-text')

    // the SwiftUI element has to survive a recycle, because the model is rebuilt on reset.
    tap({ label: 'index' })
    await wait('accessibility: home mounted', () => true, true)
    await tapNav('nav-one-native-accessibility')
    await wait(
      'accessibility: a recycled composed control still carries its label',
      (n) => labels(n).includes('Composed switch')
    )
    await wait(
      'accessibility: a recycled composed control still carries its testID',
      (n) => Boolean(id(n, 'one-native-a11y-composed'))
    )
    if (!control(snapshot(config.simulatorId), 'Form switch'))
      throw new Error('A recycled Form lost its composed control')
    checks.push({
      name: 'accessibility: a recycled Form keeps its composed control',
      durationMs: 0,
    })
    console.log('PASS accessibility: a recycled Form keeps its composed control')

    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'host') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    // SwiftUI does not publish Host itself as an accessibility element. Require its native
    // onLayout receipt and independently calculate the exact frame union of its rendered children.
    const size = (nodes: Node[], width: number, height: number) => {
      const frames = nodes
        .filter(
          (node) =>
            node.frame &&
            (node.AXLabel === 'Toggle' ||
              node.AXLabel?.startsWith('Toggle with a much longer label') ||
              node.AXLabel === 'Composed button' ||
              node.AXLabel?.startsWith('Composed stepper,'))
        )
        .map((node) => node.frame!)
      if (!frames.length || !status(nodes, 'Host', `${width} x ${height}`)) return false
      const left = Math.min(...frames.map((frame) => frame.x))
      const top = Math.min(...frames.map((frame) => frame.y))
      const right = Math.max(...frames.map((frame) => frame.x + frame.width))
      const bottom = Math.max(...frames.map((frame) => frame.y + frame.height))
      return Math.round(right - left) === width && Math.round(bottom - top) === height
    }
    const control = (nodes: Node[], type: string, label: string) =>
      nodes.find((node) => node.type === type && node.AXLabel === label)
    // iOS switch tracking needs a physical press; an instantaneous HID tap never begins
    // tracking, so a composed Toggle would look like it never emitted.
    const pressSwitch = async () => {
      const nodes = await wait('composed switch is ready', (n) =>
        Boolean(control(n, 'CheckBox', 'Toggle')?.frame)
      )
      const frame = control(nodes, 'CheckBox', 'Toggle')!.frame!
      touch(frame.x + frame.width - 25, frame.y + frame.height / 2)
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
    await visualScreenshot('host-three-children.png', 'host-three-children')

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
      const decrement = control(n, 'Button', 'Composed stepper, Decrement')?.frame
      const increment = control(n, 'Button', 'Composed stepper, Increment')?.frame
      const pixels = (value: number) => Math.round(value * 3)
      return Boolean(
        toggle &&
        button &&
        decrement &&
        increment &&
        status(n, 'Host', '361 x 128') &&
        pixels(toggle.x + toggle.width) <= pixels(button.x) &&
        pixels(button.x + button.width) <= pixels(decrement.x) &&
        pixels(decrement.x + decrement.width) === pixels(increment.x) &&
        pixels(toggle.y) === pixels(button.y) &&
        pixels(decrement.y) === pixels(increment.y)
      )
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
    // MapKit publishes each annotation as an element carrying the marker's
    // title, so the markers React sent are readable without a screenshot. the
    // surface itself is the test-id box: this tree exposes no 'Map' label.
    const surface = (nodes: Node[]) => id(nodes, 'one-native-map-view')
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
      (n) =>
        status(n, 'Place', 'Ferry') && status(n, 'Pins', 2) && status(n, 'Height', 220)
    )
    // a fill control reports no ideal height, so the box React Native gave it is the only
    // thing that can be deciding this size.
    await wait(
      'Map fills the box React Native gave it',
      (n) => surface(n)?.frame?.height === 220 && surface(n)?.frame?.width === 373
    )
    // MapKit publishes its surface before its annotations and tiles have painted. Marker AX
    // presence gates the model, then the pixel gate below gates the asynchronous paint.
    await wait(
      'the markers React sent are on the map',
      (n) => has(n, 'Coit Tower') && has(n, 'Ballpark') && !has(n, 'Pyramid')
    )
    await visualScreenshot('map-two-pins.png', 'map-markers')
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
    tap({ id: 'one-native-map-pins' })
    await wait(
      'adding a marker adds it to the map',
      (n) => status(n, 'Pins', 3) && has(n, 'Pyramid') && has(n, 'Coit Tower')
    )
    screenshot('map-three-pins.png')
    tap({ id: 'one-native-map-pins' })
    await wait(
      'emptying the array removes every marker',
      (n) =>
        status(n, 'Pins', 0) &&
        !has(n, 'Pyramid') &&
        !has(n, 'Coit Tower') &&
        !has(n, 'Ballpark')
    )
    await visualScreenshot('map-no-pins.png', 'map-tiles')

    // the camera the fixture seeded is what MapKit settled on, reported back through
    // onRegionChange rather than assumed.
    await wait('the camera reports the place it was seeded with', (n) =>
      status(n, 'Center', '37.7955,-122.3937')
    )
    const before = regions(snapshot(config.simulatorId))
    tap({ id: 'one-native-map-place-presidio' })
    await wait(
      're-centering moves the camera and reports it',
      (n) => status(n, 'Center', '37.7989,-122.4662') && regions(n) > before
    )
    screenshot('map-presidio.png')
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'ui-map') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    // the surface is the test-id box: this tree exposes no 'Map' label,
    // while each pin is an element carrying the marker's title.
    const surface = (nodes: Node[]) => id(nodes, 'one-native-ui-map-view')
    const camera = (nodes: Node[]) =>
      labels(nodes)
        .find((label) => label.startsWith('Camera: '))
        ?.slice('Camera: '.length) ?? 'none'
    const reportedZoom = (nodes: Node[]) => Number(camera(nodes).split(',')[2])
    const moves = (nodes: Node[]) =>
      Number(
        labels(nodes)
          .find((label) => label.startsWith('Moves: '))
          ?.slice('Moves: '.length) ?? -1
      )
    // the zoom probe: the seed writes a google-zoom span and the report
    // inverts it, so the round trip has to land within one level. the
    // measured value is logged with every assertion for the record.
    const zoomNear = (nodes: Node[], expected: number) => {
      const measured = reportedZoom(nodes)
      return Number.isFinite(measured) && Math.abs(measured - expected) <= 1
    }

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-ui-map')
    await wait(
      'fresh ui map mounted',
      (n) =>
        status(n, 'Place', 'Ferry') &&
        status(n, 'Zoom', 12) &&
        status(n, 'Pins', 2) &&
        status(n, 'Overlays', 'on') &&
        status(n, 'Height', 220)
    )
    await wait(
      'UiMap fills the box React Native gave it',
      (n) => surface(n)?.frame?.height === 220 && surface(n)?.frame?.width === 373
    )
    await wait(
      'the markers React sent are on the map',
      (n) =>
        has(n, 'Coit Tower') &&
        has(n, 'Ballpark') &&
        !has(n, 'Pyramid') &&
        !has(n, 'Ferry Landing')
    )
    tap({ id: 'one-native-ui-map-height' })
    await wait(
      'the map follows the box when the style changes',
      (n) => status(n, 'Height', 320) && surface(n)?.frame?.height === 320
    )
    tap({ id: 'one-native-ui-map-height' })
    await wait(
      'the map follows the box back',
      (n) => status(n, 'Height', 220) && surface(n)?.frame?.height === 220
    )
    // tapping the pin reports through marker selection; the map-tap gesture
    // stays silent for taps inside a pin's touch target.
    tap({ label: 'Coit Tower' })
    await wait(
      'tapping a pin reports its id and no map tap',
      (n) => status(n, 'MarkerTap', 'coit') && status(n, 'MapTap', 'none')
    )
    // the pin capture runs with overlays off so the magenta gate reads the
    // tinted pin alone; the bare capture below is its negative.
    tap({ id: 'one-native-ui-map-overlays' })
    await wait('overlays toggle off', (n) => status(n, 'Overlays', 'off'))
    await visualScreenshot('ui-map-pins.png', 'ui-map-pins')
    tap({ id: 'one-native-ui-map-pins' })
    await wait(
      'adding a marker adds it to the map',
      (n) => status(n, 'Pins', 3) && has(n, 'Pyramid') && has(n, 'Coit Tower')
    )
    tap({ id: 'one-native-ui-map-pins' })
    await wait(
      'the fourth pin lands on the camera centre',
      (n) => status(n, 'Pins', 4) && has(n, 'Ferry Landing')
    )
    tap({ id: 'one-native-ui-map-pins' })
    await wait(
      'emptying the array removes every marker',
      (n) =>
        status(n, 'Pins', 0) &&
        !has(n, 'Pyramid') &&
        !has(n, 'Coit Tower') &&
        !has(n, 'Ballpark') &&
        !has(n, 'Ferry Landing')
    )
    screenshot('ui-map-bare.png')
    // with no pins left, a tap on open water can only be a map tap, and it
    // must not disturb the marker tap the pin reported earlier. the point is
    // water, not the centre: MapKit consumes taps on POIs the way Google
    // routes them to onPoiClick instead of onMapClick, and the seeded
    // centre sits under the Ferry Building POI.
    const frame = surface(snapshot(config.simulatorId))?.frame
    if (!frame) throw new Error('ui-map surface disappeared before the map tap')
    point(frame.x + frame.width * 0.85, frame.y + frame.height / 2)
    await wait('tapping the map reports the tap point and keeps the marker tap', (n) => {
      if (!status(n, 'MarkerTap', 'coit')) return false
      const tap = labels(n).find((label) => label.startsWith('MapTap: '))
      if (!tap) return false
      const [lat, lng] = tap.slice('MapTap: '.length).split(',').map(Number)
      return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat - 37.7955) < 0.005 &&
        lng > -122.36 &&
        lng < -122.33
      )
    })
    tap({ id: 'one-native-ui-map-overlays' })
    await wait('overlays toggle back on', (n) => status(n, 'Overlays', 'on'))
    await visualScreenshot('ui-map-overlays.png', 'ui-map-overlays')
    await visualScreenshot('ui-map-polyline.png', 'ui-map-polyline')
    await wait(
      'the camera reports the place it was seeded with',
      (n) =>
        labels(n).some((label) => label.startsWith('Camera: 37.7955,-122.3937,')) &&
        zoomNear(n, 12)
    )
    console.log(
      `ui-map probe: seeded zoom 12 reads back ${camera(snapshot(config.simulatorId))}`
    )
    const movesBeforeZoom = moves(snapshot(config.simulatorId))
    tap({ id: 'one-native-ui-map-zoom' })
    await wait(
      'zooming out moves the camera and reports it',
      (n) => status(n, 'Zoom', 10) && zoomNear(n, 10) && moves(n) > movesBeforeZoom
    )
    console.log(
      `ui-map probe: seeded zoom 10 reads back ${camera(snapshot(config.simulatorId))}`
    )
    const movesBeforeZoomIn = moves(snapshot(config.simulatorId))
    tap({ id: 'one-native-ui-map-zoom' })
    await wait(
      'zooming in moves the camera and reports it',
      (n) => status(n, 'Zoom', 14) && zoomNear(n, 14) && moves(n) > movesBeforeZoomIn
    )
    console.log(
      `ui-map probe: seeded zoom 14 reads back ${camera(snapshot(config.simulatorId))}`
    )
    const movesBeforePlace = moves(snapshot(config.simulatorId))
    tap({ id: 'one-native-ui-map-place-presidio' })
    await wait(
      're-centering moves the camera and reports it',
      (n) =>
        labels(n).some((label) => label.startsWith('Camera: 37.7989,-122.4662,')) &&
        zoomNear(n, 14) &&
        moves(n) > movesBeforePlace
    )
    screenshot('ui-map-presidio.png')
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'gpu') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    // the canvases publish no accessibility content of their own; the pane
    // wrappers carry the test ids and the fixture reports paint through its
    // status labels, one per pane plus the frame tick and shader verdict.
    const triangle = (nodes: Node[]) => id(nodes, 'one-native-gpu-triangle')
    const fiber = (nodes: Node[]) => id(nodes, 'one-native-gpu-fiber')
    const ticks = (nodes: Node[]) =>
      Number(
        labels(nodes)
          .find((label) => label.startsWith('Ticks: '))
          ?.slice('Ticks: '.length) ?? -1
      )
    const shader = (nodes: Node[]) =>
      labels(nodes)
        .find((label) => label.startsWith('Shader: '))
        ?.slice('Shader: '.length) ?? 'pending'

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-gpu')
    await wait(
      'fresh gpu fixture mounted',
      (n) => Boolean(id(n, 'one-native-gpu-screen')) && status(n, 'Triangle', 'pending')
    )
    await wait(
      'both canvases took layout',
      (n) =>
        triangle(n)?.frame?.height === 220 &&
        fiber(n)?.frame?.height === 220 &&
        (triangle(n)?.frame?.width ?? 0) > 0
    )
    await wait('raw webgpu triangle painted its first frame', (n) =>
      status(n, 'Triangle', 'ready')
    )
    await wait('r3f scene painted its first frame', (n) => status(n, 'Fiber', 'ready'))
    screenshot('gpu-painted.png')
    const before = ticks(snapshot(config.simulatorId))
    await wait('the fiber loop keeps rendering', (n) => ticks(n) > before)
    await wait('shader probe reached a verdict', (n) => shader(n) !== 'pending')
    console.log(`gpu probe: shader verdict ${shader(snapshot(config.simulatorId))}`)
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
    // both assets resolved before either native control was handed a url.
    await wait(
      'fixture wrote both media files',
      (n) =>
        status(n, 'Category', 'Player') &&
        status(n, 'Sources', 'ready') &&
        status(n, 'Autoplay', 'off') &&
        status(n, 'Height', 220)
    )
    // a fill control reports no ideal height, so the box React Native gave it is the only
    // thing that can be deciding this size.
    await wait(
      'VideoPlayer fills the box React Native gave it',
      (n) => player(n)?.frame?.height === 220 && player(n)?.frame?.width === 373
    )
    await visualScreenshot('media-player.png', 'media-player')
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
    screenshot('media-playing.png')

    tap({ id: 'one-native-media-category-preview' })
    await wait(
      'fresh QuickLook mounted',
      (n) =>
        status(n, 'Category', 'Preview') &&
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 0)
    )
    screenshot('media-no-player.png')
    tap({ id: 'one-native-media-open' })
    // the text search button proves QuickLook resolved the local or downloaded asset to a
    // readable text preview rather than presenting an empty controller.
    await wait(
      'QuickLook previews the file it was given',
      (n) =>
        Boolean(id(n, 'QLOverlayDoneButtonAccessibilityIdentifier')) &&
        Boolean(
          id(n, 'QLTextItemViewControllerBarSearchRightButtonAccessibilityIdentifier')
        )
    )
    screenshot('media-quicklook-open.png')
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
    await visualScreenshot('alert-open.png', 'alert-dialog')
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
    await visualScreenshot('confirmation-visible.png', 'confirmation-title')
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
  if (config.suite === 'dialogs-lifecycle') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    const dialogButton = (nodes: Node[], label: string) =>
      nodes.some((node) => node.AXLabel === label && node.type === 'Button')
    const nestedPresented = (nodes: Node[]) =>
      dialogButton(nodes, 'Cancel nested') && dialogButton(nodes, 'Confirm nested')

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    // tapNav's scroll-to-fully-visible cannot settle on this row: synthetic flings
    // overshoot it now that routes below keep them from bottoming out. fresh
    // launches land it center-visible, so tap it by id with an on-screen guard.
    const navNodes = await wait(
      'home lists nav-one-native-dialogs',
      (n) => Boolean(id(n, 'nav-one-native-dialogs')),
      true
    )
    const navRow = id(navNodes, 'nav-one-native-dialogs')?.frame
    const navApp = navNodes.find((n) => n.type === 'Application')?.frame
    const navCenter = navRow ? navRow.y + navRow.height / 2 : -1
    if (!navRow || !navApp || navCenter < 0 || navCenter > navApp.height)
      throw new Error('nav-one-native-dialogs is not on screen for a direct tap')
    tap({ id: 'nav-one-native-dialogs' })
    // the fresh standalone state rides along: the lifecycle UI shares the fixture,
    // so its mount proves the additions disturbed nothing.
    await wait(
      'nested lifecycle controls mounted',
      (n) =>
        status(n, 'Category', 'Alert') &&
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 0) &&
        status(n, 'Actions', 0) &&
        status(n, 'Last', 'none') &&
        status(n, 'Reject', 'off') &&
        status(n, 'Revision', 0) &&
        status(n, 'Nested presented', 'false') &&
        status(n, 'Nested changes', 0) &&
        status(n, 'Nested actions', 0) &&
        status(n, 'Nested last', 'none') &&
        Boolean(id(n, 'one-native-dialog-lifecycle-open'))
    )
    tap({ id: 'one-native-dialog-lifecycle-open' })
    await wait('nested Alert presents under its attached root', nestedPresented)
    screenshot('nested-attached.png')
    // the fixture detaches itself: no tap can reach the toggle while the alert
    // owns the screen. detaching must take the presentation down silently: React
    // keeps presenting and the change count carries native events only, so any
    // increment here is a phantom dismissal from the teardown. the Attach label
    // proves the detach happened rather than the dialog closing itself.
    await wait(
      'detaching the root dismisses the nested Alert without events',
      (n) =>
        !dialogButton(n, 'Cancel nested') &&
        labels(n).includes('Attach root') &&
        status(n, 'Nested presented', 'true') &&
        status(n, 'Nested changes', 0)
    )
    tap({ id: 'one-native-dialog-lifecycle-toggle' })
    await wait('reattach restores the presented nested Alert', nestedPresented)
    screenshot('nested-reattached.png')
    tap({ label: 'Cancel nested' })
    await wait(
      'cancel after reattach emits once',
      (n) =>
        status(n, 'Nested presented', 'false') &&
        status(n, 'Nested changes', 1) &&
        status(n, 'Nested actions', 1) &&
        status(n, 'Nested last', 'cancel')
    )
    tap({ id: 'one-native-dialog-lifecycle-toggle' })
    await wait(
      'root detaches while nothing presents',
      (n) => labels(n).includes('Attach root') && status(n, 'Nested presented', 'false')
    )
    tap({ id: 'one-native-dialog-lifecycle-open' })
    // a presenter mounted before root attachment stays silent: no dialog may appear
    // while detached, and the pending presentation must not emit either.
    await new Promise((resolve) => setTimeout(resolve, 2500))
    const silent = snapshot(config.simulatorId)
    if (dialogButton(silent, 'Cancel nested'))
      throw new Error('a nested presenter presented while its root was detached')
    if (
      !status(silent, 'Nested presented', 'true') ||
      !status(silent, 'Nested changes', 1)
    )
      throw new Error('a detached root must hold React state without native events')
    tap({ id: 'one-native-dialog-lifecycle-toggle' })
    await wait('pending presentation appears on attach', nestedPresented)
    tap({ label: 'Cancel nested' })
    await wait(
      'cancel after attach emits once',
      (n) =>
        status(n, 'Nested presented', 'false') &&
        status(n, 'Nested changes', 2) &&
        status(n, 'Nested actions', 2) &&
        status(n, 'Nested last', 'cancel')
    )
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'pickers') {
    // match the segmented control by its native component identity and exact xcode 26.4 bounds,
    // so the tap cannot silently address a different tab group.
    const segmented = (nodes: Node[]) =>
      nodes.find(
        (node) =>
          node.AXUniqueId === 'one-native-control' &&
          node.type === 'TabGroup' &&
          node.frame &&
          node.frame.width === 373 &&
          node.frame.height === 31
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
          node.frame.height === 216
      )?.frame
    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-controls')
    await wait(
      'segmented picker mounted',
      (nodes) => value(nodes, 'alpha') && nodes.some((node) => node.type === 'TabGroup')
    )
    await visualScreenshot('picker-segmented.png', 'picker-segmented')
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
      (nodes) =>
        value(nodes, 'beta') && request(nodes, 'beta') && Boolean(wheel(nodes, 1))
    )
    tap({ id: 'one-native-control-style' })
    await wait(
      'inline picker mounts',
      (nodes) =>
        labels(nodes).includes('Style: inline · Reject: off') &&
        nodes.some(
          (node) => node.type === 'Slider' && node.frame && node.frame.height === 216
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
    if (Math.round(group.width * 3) !== 1119 || Math.round(group.height * 3) !== 1133)
      throw new Error(
        'Graphical calendar geometry differs from the calibrated iOS 26.4 fixture'
      )
    await visualScreenshot('date-graphical.png', 'date-graphical')
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
    if (!recycledWheel)
      throw new Error('Expected recycled wheel Slider bounds height 216')
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
  if (config.suite === 'apple-file') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    // the black Apple button publishes its title; the tap goes to the native node.
    const signInButton = (nodes: Node[]) =>
      nodes.find(
        (node) => node.type === 'Button' && node.AXLabel === 'Sign in with Apple'
      )
    // the picker answers no accessibility query while it is up, so presentation
    // is the bare tree and dismissal is the fixture coming back.
    const pickerUp = (nodes: Node[]) =>
      nodes.length > 0 && nodes.every((node) => node.type === 'Application')
    // calibrated on a 402x874 iPhone 17 Pro (asserted from the app frame below).
    // rows only answer on content, so every point lands on text or an icon: the
    // close button top-right in Recents and folder views (top-left only on the
    // Browse root, which a fresh presentation never opens on), the Browse tab,
    // the expandable Locations header, the On My iPhone row text, the app
    // folder icon, and the seeded file thumbnail. Browse restores its last
    // location, so it lands in the folder or on the root; the taps converge
    // either way, since the root path drills down to the same file.
    const closePoint = { x: 328, y: 100 }
    const browsePoint = { x: 307, y: 835 }
    const locationsPoint = { x: 150, y: 230 }
    const onMyIPhonePoint = { x: 120, y: 344 }
    const folderPoint = { x: 79, y: 243 }
    const filePoint = { x: 77, y: 231 }
    const seedName = 'one-native-seed.txt'
    const seedContent = 'one-native fileImporter seed\n'
    const seedPickerFile = () => {
      const container = execFileSync(
        'xcrun',
        ['simctl', 'get_app_container', config.simulatorId, config.bundleId, 'data'],
        { encoding: 'utf8' }
      ).trim()
      const documents = path.join(container, 'Documents')
      fs.mkdirSync(documents, { recursive: true })
      fs.writeFileSync(path.join(documents, seedName), seedContent)
      return container
    }

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-apple-file')
    await wait(
      'fresh SignIn mounted',
      (n) =>
        status(n, 'Category', 'SignIn') &&
        status(n, 'Completions', 0) &&
        status(n, 'Type', 'none') &&
        status(n, 'User', 'none') &&
        status(n, 'Message', 'none')
    )
    await wait('SignInWithAppleButton renders', (n) => {
      const button = signInButton(n)
      return Boolean(button?.frame && button.frame.width > 0 && button.frame.height > 0)
    })
    screenshot('apple-file-signin.png')
    tap({ label: 'Sign in with Apple' })
    await wait(
      'tapping starts the request and reports its completion',
      (n) =>
        status(n, 'Completions', 1) &&
        status(n, 'Type', 'failed') &&
        !status(n, 'Message', 'none'),
      false,
      () =>
        `completion rows: ${labels(snapshot(config.simulatorId))
          .filter((label) => /Completions|Type|Message|User/.test(label))
          .join(' | ')}`
    )
    screenshot('apple-file-signin-completion.png')

    tap({ id: 'one-native-apple-file-category-files' })
    const filesNodes = await wait(
      'fresh FileImporter mounted',
      (n) =>
        status(n, 'Category', 'Files') &&
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 0) &&
        status(n, 'Completions', 0) &&
        status(n, 'Type', 'none') &&
        !pickerUp(n)
    )
    const appFrame = filesNodes.find((n) => n.type === 'Application')?.frame
    if (appFrame?.width !== 402 || appFrame?.height !== 874)
      throw new Error(
        `Expected a 402x874 iPhone 17 Pro display, got ${JSON.stringify(appFrame)}`
      )
    const container = seedPickerFile()
    tap({ id: 'one-native-apple-file-open' })
    await wait('fileImporter presents the document picker', (n) => pickerUp(n))
    screenshot('apple-file-picker-open.png')
    point(closePoint.x, closePoint.y)
    // a previous run that died mid-navigation restores the Browse root, whose
    // close button sits top-left; the second tap only fires when the first
    // missed, which the bare tree proves.
    await Bun.sleep(2000)
    if (pickerUp(snapshot(config.simulatorId))) point(28, 100)
    await wait(
      'cancel reports dismissal and a cancelled completion',
      (n) =>
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 2) &&
        status(n, 'Completions', 1) &&
        status(n, 'Type', 'cancelled') &&
        status(n, 'Message', 'none')
    )
    screenshot('apple-file-picker-cancelled.png')

    // the picker is AX-blind but its states read off pixels: the folder title
    // spans the left nav area only in the folder view, the Locations header
    // text only on the Browse root, and the On My iPhone phone icon only
    // when Locations is expanded. calibrated off device captures with at
    // least 3x margin on every probe. Browse restores its last location and
    // the sections keep their expansion across presentations, so the pick
    // drives closed-loop: classify, tap, re-shot, and fail loud instead of
    // tapping blind into the wrong state.
    const pickerShot = (name: string) => readPng(screenshot(name))
    const countWhere = (
      image: ReturnType<typeof readPng>,
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      match: (r: number, g: number, b: number) => boolean
    ) => {
      const scale = image.width / 402
      let found = 0
      for (let y = Math.floor(y0 * scale); y <= Math.ceil(y1 * scale); y++)
        for (let x = Math.floor(x0 * scale); x <= Math.ceil(x1 * scale); x++) {
          const i = (y * image.width + x) * 4
          if (match(image.data[i], image.data[i + 1], image.data[i + 2])) found++
        }
      return found
    }
    const isDark = (r: number, g: number, b: number) => r < 100 && g < 100 && b < 100
    const isBlue = (r: number, g: number, b: number) =>
      b > 180 && b > r + 60 && b > g + 40
    const isRed = (r: number, g: number, b: number) => r > 180 && r > g + 60 && r > b + 60
    const pickerState = (image: ReturnType<typeof readPng>) => {
      if (countWhere(image, 70, 90, 130, 110, isDark) > 200) return 'folder' as const
      if (countWhere(image, 34, 229, 46, 241, isDark) > 50) return 'root' as const
      return 'elsewhere' as const
    }
    // both the pick and the swipe-down cancel start from the app folder: the
    // single file sits top-left there on every visit.
    const gotoPickerFolder = async (leg: string) => {
      // reach the Browse root or the folder from wherever the presentation
      // restored: Recents enters Browse, a pushed view pops back to the root.
      let state: 'folder' | 'root' | 'elsewhere' = 'elsewhere'
      for (let attempt = 0; attempt < 4 && state === 'elsewhere'; attempt++) {
        point(browsePoint.x, browsePoint.y)
        await Bun.sleep(1500)
        state = pickerState(pickerShot(`apple-file-nav-${leg}-browse-${attempt}.png`))
        if (state !== 'elsewhere') break
        point(30, 100)
        await Bun.sleep(1500)
        state = pickerState(pickerShot(`apple-file-nav-${leg}-back-${attempt}.png`))
      }
      if (state === 'elsewhere')
        throw new Error(`${leg} navigation never reached the Browse tree`)
      if (state === 'root') {
        // expand Locations from either state: the phone icon proves expanded,
        // the tag dot proves collapsed, anything else is a collapsed Tags
        // section hiding the rows below it.
        for (let attempt = 0; ; attempt++) {
          const image = pickerShot(`apple-file-nav-${leg}-sections-${attempt}.png`)
          if (countWhere(image, 34, 314, 46, 326, isBlue) > 40) break
          if (attempt === 4) throw new Error(`${leg} navigation never expanded Locations`)
          if (countWhere(image, 32, 332, 48, 348, isRed) > 40)
            point(locationsPoint.x, locationsPoint.y)
          else point(200, 280)
          await Bun.sleep(1500)
        }
        point(onMyIPhonePoint.x, onMyIPhonePoint.y)
        await Bun.sleep(1500)
        point(folderPoint.x, folderPoint.y)
        await Bun.sleep(1500)
      }
    }
    tap({ id: 'one-native-apple-file-open' })
    await wait('fileImporter presents for the pick', (n) => pickerUp(n))
    await gotoPickerFolder('pick')
    screenshot('apple-file-picker-file.png')
    point(filePoint.x, filePoint.y)
    const picked = await wait(
      'picking reports the copied file',
      (n) =>
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 4) &&
        status(n, 'Completions', 2) &&
        status(n, 'Type', 'success') &&
        status(n, 'Index', 0) &&
        status(n, 'Count', 1) &&
        status(n, 'Message', 'none') &&
        labels(n).some(
          (label) =>
            label.startsWith('Url: file://') &&
            label.includes('one-native-file-importer') &&
            label.endsWith(`/${seedName}`)
        )
    )
    screenshot('apple-file-pick-completion.png')
    const url = labels(picked)
      .find((label) => label.startsWith('Url: file://'))!
      .slice('Url: file://'.length)
    if (!url.startsWith(`${container}/Library/Caches/one-native-file-importer/`))
      throw new Error(`Pick reported a url outside the importer copies: ${url}`)
    const copied = fs.readFileSync(decodeURIComponent(url), 'utf8')
    if (copied !== seedContent)
      throw new Error(`Pick copy holds ${JSON.stringify(copied)} instead of the seed`)
    checks.push({ name: 'pick copy is readable on disk', durationMs: 0 })
    console.log('PASS pick copy is readable on disk')

    tap({ id: 'one-native-apple-file-open' })
    await wait('fileImporter presents for the swipe-down', (n) => pickerUp(n))
    await gotoPickerFolder('swipe')
    screenshot('apple-file-picker-swipe.png')
    // the drag starts on the sheet title bar: a mid-sheet drag scrolls the
    // file grid instead of dismissing the sheet (proven on device).
    axe(
      [
        'swipe',
        '--start-x',
        '201',
        '--start-y',
        '225',
        '--end-x',
        '201',
        '--end-y',
        '750',
        '--duration',
        '1.0',
      ],
      config.simulatorId
    )
    await wait(
      'swipe-down reports dismissal and a cancelled completion',
      (n) =>
        status(n, 'Presented', 'false') &&
        status(n, 'Changes', 6) &&
        status(n, 'Completions', 3) &&
        status(n, 'Type', 'cancelled') &&
        status(n, 'Message', 'none')
    )
    screenshot('apple-file-picker-swiped.png')
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'clipboard') {
    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-clipboard')
    await wait('clipboard fixture mounted', (n) => labels(n).includes('Written: none'))
    tap({ id: 'one-native-clipboard-set' })
    await wait('setString reports true', (n) => labels(n).includes('Written: true'))
    tap({ id: 'one-native-clipboard-get' })
    await wait('getString reads the write back', (n) =>
      labels(n).includes('Read: one-native-clipboard-probe')
    )
    tap({ id: 'one-native-clipboard-has' })
    await wait('hasString sees the string', (n) => labels(n).includes('Has: true'))
    screenshot('clipboard-roundtrip.png')

    for (const cycle of [1, 2]) {
      tap({ label: 'index' })
      await wait(`clipboard recycle ${cycle}: home mounted`, () => true, true)
      await tapNav('nav-one-native-clipboard')
      await wait(`clipboard recycle ${cycle}: a fresh fixture mounts`, (n) =>
        labels(n).includes('Written: none')
      )
      tap({ id: 'one-native-clipboard-get' })
      await wait(`clipboard recycle ${cycle}: the pasteboard outlives the fixture`, (n) =>
        labels(n).includes('Read: one-native-clipboard-probe')
      )
    }
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'network') {
    const stateOf = (nodes: Node[]) => {
      const label = labels(nodes).find((text) => text.startsWith('State: '))
      if (!label) return null
      const [, type, connected, reachable] = label.split(' ')
      return { type, connected, reachable }
    }
    const eventsOf = (nodes: Node[]) => {
      const label = labels(nodes).find((text) => text.startsWith('Events: '))
      return label ? Number(label.slice('Events: '.length)) : NaN
    }

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-network')

    // the simulator has a live host route, so the correct reading is a named
    // type with both flags true. none would prove the monitor never started.
    await wait('the one-shot read publishes live state', (n) => {
      const state = stateOf(n)
      return Boolean(
        state &&
        state.type &&
        state.type !== 'none' &&
        state.connected === 'true' &&
        state.reachable === 'true'
      )
    })
    await wait('the listener fires at least once', (n) => eventsOf(n) >= 1)
    tap({ id: 'one-native-network-refresh' })
    await wait('a refresh re-reads live state', (n) => {
      const state = stateOf(n)
      return Boolean(state && state.connected === 'true' && state.reachable === 'true')
    })
    screenshot('network-state.png')

    for (const cycle of [1, 2]) {
      tap({ label: 'index' })
      await wait(`network recycle ${cycle}: home mounted`, () => true, true)
      await tapNav('nav-one-native-network')
      await wait(`network recycle ${cycle}: state publishes again`, (n) => {
        const state = stateOf(n)
        return (
          Boolean(state && state.type !== 'none' && state.connected === 'true') &&
          eventsOf(n) >= 1
        )
      })
    }
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'browser') {
    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-browser')
    await wait('browser fixture mounted', (n) => labels(n).includes('Result: none'))

    // a user dismiss resolves cancel. the sheet exposes no accessibility
    // children, so presentation is the collapsed tree and the close tap
    // lands on the measured button point, guarded by the pinned display.
    tap({ id: 'one-native-browser-open' })
    const presented = await wait('the safari sheet presents', browserPresented)
    const app = presented.find((n) => n.type === 'Application')?.frame
    if (!app || app.width !== 393 || app.height !== 852)
      throw new Error(`Expected a 393x852 iPhone 16 display, got ${JSON.stringify(app)}`)
    screenshot('browser-open.png')
    point(38, 81)
    await wait('a user dismiss resolves cancel', (n) =>
      labels(n).includes('Result: cancel')
    )

    // a programmatic dismiss resolves dismiss on both promises.
    tap({ id: 'one-native-browser-open-dismiss' })
    await wait(
      'dismiss resolves dismiss',
      (n) =>
        labels(n).includes('Opened: dismiss') && labels(n).includes('Dismissed: dismiss')
    )
    screenshot('browser-dismiss.png')

    // dismissing a pending auth session resolves its promise as dismiss.
    // the consent alert lives outside the app tree, so no tap can reach
    // it; the session is canceled and settled programmatically.
    tap({ id: 'one-native-browser-auth-dismiss' })
    await wait('dismissAuthSession dismisses the auth session', (n) =>
      labels(n).includes('Auth: dismiss')
    )
    screenshot('browser-auth.png')

    // a redirect to the app scheme completes the session with the url.
    // the runner serves the 302 locally; ephemeral mode skips the
    // consent alert, which lives outside the app tree.
    const redirectServer = Bun.serve({
      port: 8123,
      fetch: () => Response.redirect('nativefeatures://auth?code=ios1', 302),
    })
    try {
      tap({ id: 'one-native-browser-auth-redirect' })
      await wait('the redirect completes the auth session', (n) =>
        labels(n).includes('Auth: success nativefeatures://auth?code=ios1')
      )
    } finally {
      redirectServer.stop()
    }
    screenshot('browser-auth-redirect.png')

    for (const cycle of [1, 2]) {
      tap({ label: 'index' })
      await wait(`browser recycle ${cycle}: home mounted`, () => true, true)
      await tapNav('nav-one-native-browser')
      await wait(`browser recycle ${cycle}: a fresh fixture mounts`, (n) =>
        labels(n).includes('Result: none')
      )
    }
    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'notifications') {
    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-notifications')
    await wait('notifications fixture mounted', (n) => has(n, 'Notifications: mounted'))
    // the fixture scrolls; bring each button fully on screen like tapNav does.
    const tapFixture = async (testID: string) => {
      let last: { x: number; y: number } | undefined
      let swiped = false
      for (let attempt = 0; attempt < 10; attempt++) {
        const nodes = snapshot(config.simulatorId)
        const app = nodes.find((node) => node.type === 'Application')?.frame
        const row = id(nodes, testID)?.frame
        // axe can sample mid-commit while the fixture settles, so a missing
        // frame retries like the scroll below instead of failing the suite.
        if (!app || !row) {
          last = undefined
          await new Promise((resolve) => setTimeout(resolve, 250))
          continue
        }
        // the nav header overlays the scroll view, so a row slid under it
        // reads as on screen while the header takes the tap.
        const back = id(nodes, 'BackButton')?.frame
        const top = back ? back.y + back.height : 0
        if (row.y >= top && row.y + row.height <= app.height) {
          // a row scratching in on swipe momentum swallows the tap or takes
          // it stale, so after a swipe tap only once the frame repeats. a
          // row that was already still takes the tap at once.
          if (!swiped || (last && last.x === row.x && last.y === row.y))
            return tap({ id: testID })
          last = { x: row.x, y: row.y }
          await new Promise((resolve) => setTimeout(resolve, 250))
          continue
        }
        last = undefined
        swiped = true
        // a row above the header scrolls back down, one below scrolls up.
        const [from, to] = row.y < top ? [0.4, 0.6] : [0.75, 0.35]
        axe(
          [
            'swipe',
            '--start-x',
            String(Math.round(app.width / 2)),
            '--start-y',
            String(Math.round(app.height * from)),
            '--end-x',
            String(Math.round(app.width / 2)),
            '--end-y',
            String(Math.round(app.height * to)),
            '--duration',
            '0.3',
          ],
          config.simulatorId
        )
        await new Promise((resolve) => setTimeout(resolve, 400))
      }
      throw new Error(`Could not bring ${testID} into view on the fixture`)
    }
    await tapFixture('one-native-notifications-permission-refresh')
    await wait('permission starts undetermined', (n) =>
      has(n, 'Permission: undetermined')
    )
    // no simctl grant exists for notifications either, so the suite taps
    // through the real system prompt instead.
    await tapFixture('one-native-notifications-permission-request')
    await new Promise((resolve) => setTimeout(resolve, 1500))
    screenshot('notifications-permission-prompt.png')
    await tap({ label: 'Allow' })
    await tapFixture('one-native-notifications-permission-refresh')
    await wait('prompt allow reads back granted', (n) => has(n, 'Permission: granted'))
    await tapFixture('one-native-notifications-badge-set')
    await wait('badge set resolves', (n) => has(n, 'Badge: set:yes'))
    await tapFixture('one-native-notifications-badge-get')
    await wait('badge round-trips', (n) => has(n, 'Badge: 5'))
    await tapFixture('one-native-notifications-badge-clear')
    await wait('badge clear resolves', (n) => has(n, 'Badge: set:yes'))
    await tapFixture('one-native-notifications-badge-get')
    await wait('badge clears', (n) => has(n, 'Badge: 0'))
    // ios has no channels: create resolves null and the list stays empty.
    await tapFixture('one-native-notifications-channel-create')
    await wait('channel create resolves null on ios', (n) => has(n, 'Channel: null'))
    await tapFixture('one-native-notifications-channel-list')
    await wait('channel list is empty on ios', (n) => has(n, 'Channels: 0'))
    // slice n3: with no listeners mounted, native presents the arrival
    // itself instead of waiting out the 3s backstop.
    await tapFixture('one-native-notifications-schedule-unobserved')
    await wait('unobserved arrival presents fast', (n) =>
      has(n, 'Unobserved: presented in ')
    )
    await tapFixture('one-native-notifications-subscribe')
    await wait('listeners subscribed', (n) => has(n, 'Subscribed: yes'))
    // the fixture app sets no push flag, so the token getter rejects at once
    // instead of waiting on a registration the os never answers.
    await tapFixture('one-native-notifications-push-token')
    await wait('push disabled rejects', (n) =>
      labels(n).some((label) => label.startsWith('Push: error'))
    )
    // no handler was set yet, so the first observed arrival shows by default.
    await tapFixture('one-native-notifications-schedule-now')
    await wait('foreground arrival fires received', (n) => has(n, 'Received: n3-1'))
    // the banner's screen position varies by device and os, so tap its
    // observed accessibility frame rather than a fixed coordinate, the same
    // lookup the cold-start tap uses below.
    {
      const started = Date.now()
      for (;;) {
        const nodes = snapshot(config.simulatorId)
        const frame = nodes.find(
          (node) => node.AXLabel?.includes('N3 ping') && node.frame
        )?.frame
        if (frame) {
          point(
            Math.round(frame.x + frame.width / 2),
            Math.round(frame.y + frame.height / 2)
          )
          break
        }
        if (Date.now() - started > config.timeout)
          throw new Error('warm banner for N3 ping never appeared')
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
    }
    await wait('banner tap fires response', (n) => has(n, 'Response: n3-1/'))
    await tapFixture('one-native-notifications-last-refresh')
    await wait('tap is cached as last response', (n) => has(n, 'Last: n3-1/N3 ping'))
    screenshot('notifications-warm-tap.png')
    // a suppressing handler still fires received but shows no banner: poll
    // raw snapshots for 3s and fail on any node carrying the title, the
    // same lookup the banner tap uses. a fixed-coordinate tap cannot fail
    // here: it lands on app chrome either way.
    const assertNoBanner = async (name: string) => {
      const started = Date.now()
      for (;;) {
        const nodes = snapshot(config.simulatorId)
        // the fixture's own Last label carries the title too, so only a node
        // another process draws is a banner.
        const app = nodes.find((node) => node.type === 'Application')
        if (
          nodes.some(
            (node) =>
              node.pid !== app?.pid && node.AXLabel?.includes('N3 ping') && node.frame
          )
        )
          throw new Error(`${name} showed a banner`)
        if (Date.now() - started > 3000) break
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
    }
    await tapFixture('one-native-notifications-handler-suppress')
    await wait('suppressing handler set', (n) => has(n, 'Handler: suppress'))
    await tapFixture('one-native-notifications-schedule-now')
    await wait('suppressed arrival still fires received', (n) => has(n, 'Received: n3-2'))
    await assertNoBanner('a suppressed notification')
    if (!has(snapshot(config.simulatorId), 'Received: n3-2'))
      throw new Error('the suppressed arrival never reached received')
    checks.push({ name: 'suppressed n3-2 shows no banner', durationMs: 3000 })
    console.log('PASS suppressed n3-2 shows no banner')
    // a nulled handler behaves the same way.
    await tapFixture('one-native-notifications-handler-null')
    await wait('nulled handler set', (n) => has(n, 'Handler: null'))
    await tapFixture('one-native-notifications-schedule-now')
    await wait('nulled arrival still fires received', (n) => has(n, 'Received: n3-3'))
    await assertNoBanner('a nulled handler notification')
    if (!has(snapshot(config.simulatorId), 'Received: n3-3'))
      throw new Error('the nulled arrival never reached received')
    checks.push({ name: 'nulled n3-3 shows no banner', durationMs: 3000 })
    console.log('PASS nulled n3-3 shows no banner')
    // the banner's screen position varies by device and os, so tap its
    // observed accessibility frame rather than a fixed coordinate. a banner
    // lives about six seconds and a full snapshot takes three axe calls, so
    // this polls only the point probe in the banner strip, and the proof
    // shot records that probe instead of taking a snapshot of its own.
    const screenWidth = snapshot(config.simulatorId)[0].frame!.width
    const tapColdBanner = async (pngName: string, text: string) => {
      const started = Date.now()
      for (;;) {
        // the hit can be the banner's unlabeled container, so the title is
        // searched through its subtree.
        const find = (node: Node): Node | undefined =>
          node.AXLabel?.includes(text) && node.frame
            ? node
            : ((node.children as Node[] | undefined) ?? []).map(find).find(Boolean)
        const hit: Node = JSON.parse(
          axe(
            ['describe-ui', '--point', `${Math.round(screenWidth / 2)},80`],
            config.simulatorId
          )
        )
        const found = find(hit)?.frame
        if (found) {
          screenshot(pngName, [hit])
          point(
            Math.round(found.x + found.width / 2),
            Math.round(found.y + found.height / 2)
          )
          checks.push({
            name: `banner tap lands on ${text}`,
            durationMs: Date.now() - started,
          })
          console.log(`PASS banner tap lands on ${text}`)
          return
        }
        if (Date.now() - started > config.timeout)
          throw new Error(`banner for ${text} never appeared`)
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
    }
    // cold start: terminate, push a banner onto the home screen, tap it.
    // the simctl push is the probe vehicle for the launch-timing question;
    // the delegate path it exercises is the same one local taps take.
    stopApp()
    const pushPayload = path.join(config.artifactDir, 'n3-cold-push.apns')
    fs.writeFileSync(
      pushPayload,
      JSON.stringify({ aps: { alert: { title: 'N3 cold', body: 'tap me' } } })
    )
    execFileSync(
      'xcrun',
      ['simctl', 'push', config.simulatorId, config.bundleId, pushPayload],
      { stdio: 'ignore', timeout: 30_000 }
    )
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await tapColdBanner('notifications-cold-banner.png', 'N3 cold')
    await wait('cold start shows home', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-notifications')
    await wait('cold-start tap delivered last response', (n) =>
      labels(n).some((label) => label.startsWith('Last: ') && label.includes('N3 cold'))
    )
    // the relaunch dropped the n3 listeners, and without observers native
    // presents arrivals itself instead of emitting them, so subscribe again
    // before n4 expects received events.
    await tapFixture('one-native-notifications-subscribe')
    await wait('listeners re-subscribed after cold start', (n) =>
      has(n, 'Subscribed: yes')
    )
    // slice n4: clear leftovers, schedule two, cancel one, observe the other.
    await tapFixture('one-native-notifications-cancel-all')
    await wait('cancel all resolves', (n) => has(n, 'Pending: cancelled'))
    await tapFixture('one-native-notifications-dismiss-all')
    await wait('dismiss all resolves', (n) => has(n, 'Presented: dismissed'))
    await tapFixture('one-native-notifications-schedule-interval')
    await wait('interval scheduled', (n) => has(n, 'Scheduled: n4-interval'))
    await tapFixture('one-native-notifications-schedule-date')
    await wait('date scheduled', (n) => has(n, 'Scheduled: n4-date'))
    await tapFixture('one-native-notifications-scheduled-list')
    await wait('both listed as pending', (n) => has(n, 'Pending: n4-date,n4-interval'))
    await tapFixture('one-native-notifications-cancel-interval')
    await wait('interval cancelled', (n) => has(n, 'Pending: cancelled'))
    await tapFixture('one-native-notifications-scheduled-list')
    await wait('cancel removes it from pending', (n) => has(n, 'Pending: n4-date'))
    // the date trigger fires 25s after scheduling; run this suite with a
    // timeout that covers it (--timeout 60000).
    await wait('date trigger delivers to received', (n) => has(n, 'Received: n4-date'))
    await tapFixture('one-native-notifications-presented-list')
    await wait('delivered notification is presented', (n) => has(n, 'Presented: n4-date'))
    await tapFixture('one-native-notifications-dismiss-date')
    await wait('dismiss resolves', (n) => has(n, 'Presented: dismissed'))
    await tapFixture('one-native-notifications-presented-list')
    await wait('dismiss removes it from presented', (n) => has(n, 'Presented: none'))
    // local cold start: schedule 15s out, terminate, tap the delivered banner.
    await tapFixture('one-native-notifications-schedule-cold')
    await wait('cold schedule set', (n) => has(n, 'Scheduled: n4-cold'))
    stopApp()
    await new Promise((resolve) => setTimeout(resolve, 14000))
    await tapColdBanner('notifications-local-cold-banner.png', 'N4 cold')
    await wait('local cold start shows home', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-notifications')
    await wait('local cold-start tap delivered last response', (n) =>
      labels(n).some((label) => label.startsWith('Last: ') && label.includes('N4 cold'))
    )

    console.log('ALL ONE NATIVE CONFORMANCE CHECKS PASSED')
    return
  }
  if (config.suite === 'image-picker') {
    const status = (nodes: Node[], label: string, expected: string | number) =>
      labels(nodes).includes(`${label}: ${expected}`)
    const dims = (nodes: Node[]) => {
      const num = (prefix: string) => {
        const label = labels(nodes).find((line) => line.startsWith(`${prefix}: `))
        return label === undefined ? NaN : Number(label.slice(prefix.length + 2))
      }
      return { width: num('Width'), height: num('Height') }
    }
    // the picker publishes no accessibility tree, so its two taps are
    // calibrated points on the 17 Pro display, guarded by the observed
    // application frame. the waits after each tap prove they landed.
    const pickerPoint = (name: string, x: number, y: number) => {
      const app = snapshot(config.simulatorId).find(
        (node) => node.type === 'Application'
      )?.frame
      if (app?.width !== 402 || app?.height !== 874)
        throw new Error(
          `Expected a 402x874 display for the ${name} tap, got ${JSON.stringify(app)}`
        )
      point(x, y)
    }
    const pickerCovers = (nodes: Node[]) =>
      nodes.every((node) => node.type === 'Application')

    await wait('home screen mounted', () => true, true)
    await dismissWarning(true)
    await tapNav('nav-one-native-image-picker')
    await wait(
      'fixture mounted',
      (n) =>
        status(n, 'Result', 'idle') &&
        Boolean(id(n, 'one-native-image-picker-library')) &&
        Boolean(id(n, 'one-native-image-picker-camera'))
    )
    tap({ id: 'one-native-image-picker-permissions' })
    await wait('camera permission reads undecided', (n) =>
      Boolean(
        status(n, 'PermStatus', 'undetermined') &&
        status(n, 'PermGranted', 'false') &&
        status(n, 'PermCanAsk', 'true')
      )
    )
    tap({ id: 'one-native-image-picker-library' })
    await wait('the system picker presents', (n) => pickerCovers(n))
    screenshot('image-picker-open.png')
    pickerPoint('picker close', 45, 98)
    await wait('cancel resolves through the bridge', (n) =>
      Boolean(id(n, 'one-native-image-picker-library'))
    )
    await wait('cancel reports canceled', (n) => status(n, 'Result', 'canceled'))
    // seed a known portrait photo: a heic stored 120x80 with exif
    // orientation 6, so it displays 80x120. recency sorts it first, and
    // every copy is identical, so reruns that seed again stay deterministic.
    execFileSync('xcrun', [
      'simctl',
      'addmedia',
      config.simulatorId,
      fileURLToPath(
        new URL('../assets/one-native-picker-portrait.heic', import.meta.url)
      ),
    ])
    tap({ id: 'one-native-image-picker-library' })
    await wait('photo grid lists the seeded photo', (n) => pickerCovers(n))
    // a single pick dismisses on tap, with no trailing add button. recency
    // sorts the seeded photo first; the metadata below proves this tap took it.
    pickerPoint('seeded photo', 66, 378)
    // compatible mode transcodes the heic to jpeg, and the orientation 6
    // swap reports the display size, portrait.
    await wait('picked asset resolves with its metadata', (n) =>
      Boolean(
        status(n, 'Result', 'ok') &&
        status(n, 'Assets', 1) &&
        status(n, 'Width', 80) &&
        status(n, 'Height', 120) &&
        dims(n).height > dims(n).width &&
        status(n, 'Mime', 'image/jpeg') &&
        labels(n).some(
          (label) => label.startsWith('File: IMG_') && label.endsWith('.jpeg')
        ) &&
        labels(n).some((label) => {
          const match = /^Size: (\d+)$/.exec(label)
          return match !== null && Number(match[1]) > 0
        }) &&
        labels(n).some((label) => label.startsWith('Uri: file://'))
      )
    )
    // newer simulators report a camera and prompt; older ones have none.
    // denying, like missing hardware, resolves canceled.
    tap({ id: 'one-native-image-picker-camera' })
    const cameraEnd = await wait(
      'camera settles to canceled or a permission prompt',
      (n) => status(n, 'Result', 'canceled') || has(n, 'Don’t Allow')
    )
    if (!status(cameraEnd, 'Result', 'canceled')) {
      tap({ label: 'Don’t Allow' })
      await wait('denied camera resolves canceled', (n) =>
        status(n, 'Result', 'canceled')
      )
    }
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
      trigger.frame.x + trigger.frame.width / 2 === 196.5
    )
  })
  screenshot('01-centered-trigger.png')

  tap({ id: 'one-native-increment-first' })
  tap({ id: 'one-native-input-first' })
  await typeInto(
    'first tab input',
    'retained',
    (n) => id(n, 'one-native-input-first')?.AXValue
  )
  await wait('counter and input retain local state', firstState)
  tap({ id: 'one-native-select-external' })
  await wait('external selection reaches second tab', (n) => has(n, 'Second tab'))
  tap({ id: 'one-native-select-external' })
  await wait('state survives tab switching', firstState)
  await tapTab(244, 'second before action topology')
  await wait(
    'native second selection precedes topology change',
    (n) =>
      has(n, 'Selected: second') && has(n, 'Requested: second') && has(n, 'Second tab')
  )
  tap({ id: 'one-native-toggle-action-tab' })
  await wait(
    'action tab mounts without changing nonzero selection',
    (n) =>
      has(n, 'Hide action tab') &&
      has(n, 'Action presses: 0') &&
      has(n, 'Selected: second') &&
      has(n, 'Requested: second') &&
      has(n, 'Second tab')
  )
  screenshot('04-action-tab.png')
  await tapTab(84, 'first after action topology')
  await wait(
    'first tab remains selectable after topology change',
    (n) => has(n, 'Selected: first') && has(n, 'Requested: first') && firstState(n)
  )
  // an action tab is a button wearing a tab's chrome, so the press has to run the action and
  // leave the selection where it was. asserting only the counter would pass even if the tab
  // behaved like an ordinary tab and switched pages.
  //
  // 325 is the centre of the "+" glyph in its own capsule, measured off 04-action-tab.png: the
  // ink spans px x 947..1002 at 3x, so pt 324.8. The search role detaches that capsule from the
  // main pill, which is why this is not the 277 a combined tab bar would put it at.
  await tapTab(325, 'action')
  await wait(
    'action tab press runs the action and never becomes the selection',
    (n) =>
      has(n, 'Action presses: 1') &&
      has(n, 'Selected: first') &&
      has(n, 'Requested: first') &&
      has(n, 'First tab')
  )
  await tapTab(325, 'action')
  await wait(
    'action tab press is repeatable',
    (n) => has(n, 'Action presses: 2') && has(n, 'Selected: first') && has(n, 'First tab')
  )
  tap({ id: 'one-native-toggle-action-tab' })
  await wait(
    'fixture disables the action tab',
    (n) => firstState(n) && has(n, 'Show action tab')
  )

  tap({ id: 'one-native-reorder' })
  // The snapshot has no per-tab entries, so there is no honest immediate receipt for reorder.
  // The rejected native tap below is the check: x=151 addresses the first visual tab position,
  // and Request: second can only result after the keyed order has reversed.
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
    'native tab position proves keyed reorder and rejected selection',
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
  await visualScreenshot('04-palette-open.png', 'palette-menu')
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
