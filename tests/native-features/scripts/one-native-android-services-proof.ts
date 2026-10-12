#!/usr/bin/env bun
// Android runtime proof for the iOS-only services gaining Android halves:
// One.StoreReview (Play In-App Review), One.BackgroundTasks (WorkManager)
// and One.Android.CameraView (CameraX), plus the One.ScreenCapture
// prevention half (FLAG_SECURE). Installs the prebuilt debug APK on
// the given Android 37 emulator, drives each proof screen through its
// fixture, and asserts the on-screen result strings: the called state, one
// behavior check, and one negative control per service.
//
// Usage:
//   bun tests/native-features/scripts/one-native-android-services-proof.ts \
//     --device-id emulator-5554 --apk tests/native-features/android/app/build/outputs/apk/debug/app-debug.apk \
//     [--suite store-review|screen-capture-prevent|all] [--artifact-dir DIR] [--metro-port PORT] [--install-only] [--no-install]
import { execFileSync } from 'node:child_process'
import { androidXmlAttributes } from './android-ui-xml'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stampAndroidDebugHost } from './android-debug-host'
import { readPng } from './visual-pixel-gate'

const PACKAGE = 'dev.vxrn.nativefeatures.tests'
const ADB = process.env.ADB ?? 'adb'

type Args = {
  deviceId: string
  apk: string
  suite: string
  artifactDir: string
  installOnly: boolean
  noInstall: boolean
  metroPort: number
}

function parse(args: string[]): Args {
  const out: Args = {
    deviceId: '',
    apk: '',
    suite: 'all',
    artifactDir: 'tests/native-features/proofs/one-native-android-services',
    installOnly: false,
    noInstall: false,
    metroPort: 8081,
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--device-id') out.deviceId = args[++i] ?? ''
    else if (arg === '--apk') out.apk = args[++i] ?? ''
    else if (arg === '--metro-port') out.metroPort = Number(args[++i])
    else if (arg === '--suite') out.suite = args[++i] ?? 'all'
    else if (arg === '--artifact-dir') out.artifactDir = args[++i] ?? out.artifactDir
    else if (arg === '--install-only') out.installOnly = true
    else if (arg === '--no-install') out.noInstall = true
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: one-native-android-services-proof.ts --device-id <SERIAL> --apk <APK> [--suite store-review|background-tasks|screen-capture-prevent|all] [--artifact-dir DIR] [--metro-port PORT] [--install-only] [--no-install]'
      )
      process.exit(0)
    } else throw new Error(`unknown argument: ${arg}`)
  }
  if (!out.deviceId) throw new Error('--device-id is required')
  if (!out.noInstall && !out.apk) throw new Error('--apk is required unless --no-install')
  if (!Number.isInteger(out.metroPort) || out.metroPort <= 0 || out.metroPort > 65535) {
    throw new Error('a valid Metro port is required: --metro-port <PORT>')
  }
  if (
    out.suite !== 'all' &&
    out.suite !== 'store-review' &&
    out.suite !== 'background-tasks' &&
    out.suite !== 'screen-capture-prevent'
  )
    throw new Error(`unknown suite: ${out.suite}`)
  return out
}

const config = parse(process.argv.slice(2))
const artifacts = resolve(config.artifactDir)
mkdirSync(artifacts, { recursive: true })

function adb(args: string[], timeout = 60_000): string {
  return execFileSync(ADB, ['-s', config.deviceId, ...args], {
    encoding: 'utf8',
    timeout,
  })
}

function adbQuiet(args: string[]): string {
  try {
    return adb(args)
  } catch (error) {
    return String(error)
  }
}

type Bounds = { left: number; top: number; right: number; bottom: number }

type XmlNode = {
  text: string
  contentDesc: string
  resourceId: string
  className: string
  clickable: boolean
  bounds?: Bounds
}

function parseBounds(value: string | undefined): Bounds | undefined {
  if (!value) return undefined
  const match = value.match(/^\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]$/)
  if (!match) return undefined
  return { left: Number(match[1]), top: Number(match[2]), right: Number(match[3]), bottom: Number(match[4]) }
}

function parseXml(xml: string): XmlNode[] {
  const nodes: XmlNode[] = []
  const pattern = /<node\b([\s\S]*?)\/?>/g
  for (const match of xml.matchAll(pattern)) {
    const raw = match[1]
    const attrs = androidXmlAttributes(raw)
    const attr = (name: string): string => attrs[name] ?? ''
    nodes.push({
      text: attr('text'),
      contentDesc: attr('content-desc'),
      resourceId: attr('resource-id'),
      className: attr('class'),
      clickable: attr('clickable') === 'true',
      bounds: parseBounds(attr('bounds')),
    })
  }
  return nodes
}

let dumpCount = 0

function dump(saveName?: string): { xml: string; nodes: XmlNode[] } {
  const remote = `/sdcard/one-services-proof-${process.pid}.xml`
  // the on-device dumpler flakes under load (SIGKILLed mid-dump); several
  // spaced attempts separate observation noise from a wedged screen.
  // a truly wedged screen still fails, just after ~15s instead of ~2s.
  let attempts = 0
  for (;;) {
    try {
      adb(['shell', 'uiautomator', 'dump', remote])
      break
    } catch {
      attempts += 1
      if (attempts >= 5) throw new Error('uiautomator dump failed 5 times in a row')
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000)
    }
  }
  const xml = adb(['exec-out', 'cat', remote])
  dumpCount += 1
  writeFileSync(resolve(artifacts, saveName ?? `dump-${String(dumpCount).padStart(3, '0')}.xml`), xml)
  return { xml, nodes: parseXml(xml) }
}

function tap(bounds: Bounds) {
  const x = Math.floor((bounds.left + bounds.right) / 2)
  const y = Math.floor((bounds.top + bounds.bottom) / 2)
  adb(['shell', 'input', 'tap', String(x), String(y)])
}

function tapNode(node: XmlNode) {
  if (!node.bounds) throw new Error('cannot tap a node without bounds')
  tap(node.bounds)
}

function findByText(nodes: XmlNode[], text: string): XmlNode | undefined {
  return nodes.find(
    (node) =>
      (node.text === text || node.contentDesc === text) && node.bounds !== undefined
  )
}

function findByTestId(nodes: XmlNode[], testId: string): XmlNode | undefined {
  return nodes.find(
    (node) =>
      node.resourceId === testId ||
      node.resourceId.endsWith(`/${testId}`) ||
      node.resourceId.endsWith(`:id/${testId}`) ||
      node.contentDesc === testId
  )
}

function screenText(nodes: XmlNode[]): string {
  return nodes.map((node) => node.text || node.contentDesc).filter(Boolean).join('\n')
}

function assertNoRedBox(nodes: XmlNode[]) {
  const joined = screenText(nodes)
  if (/redbox|unable to resolve module|invariant violation|fatal exception|syntaxerror|typeerror/i.test(joined)) {
    throw new Error(`the app is showing a RedBox: ${joined.slice(0, 2000)}`)
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(
  match: (nodes: XmlNode[]) => boolean,
  options: { timeoutMs: number }
): Promise<XmlNode[]> {
  const deadline = Date.now() + options.timeoutMs
  let last: XmlNode[] = []
  while (Date.now() < deadline) {
    const { nodes } = dump()
    last = nodes
    assertNoRedBox(nodes)
    if (match(nodes)) return nodes
    await sleep(1000)
  }
  throw new Error(`timed out waiting for condition. last screen:\n${screenText(last).slice(0, 3000)}`)
}

function launch(route: string) {
  adb(['shell', 'pm', 'clear', PACKAGE])
  stampAndroidDebugHost(PACKAGE, config.metroPort, adb)
  adb(['shell', 'am', 'force-stop', PACKAGE])
  adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `nativefeatures://app/${route}`])
}

function launchUrl(url: string) {
  adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url])
}

function warmNavigate(route: string) {
  // no clear and no force-stop: the warm intent reaches the live activity
  // through onNewIntent, preserving coordinator and JS handler state.
  adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `nativefeatures://app/${route}`])
}

function check(name: string, actual: string, expected: string | RegExp) {
  const pass = typeof expected === 'string' ? actual.includes(expected) : expected.test(actual)
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${actual.slice(0, 400)}`)
  if (!pass) throw new Error(`check failed: ${name} (expected ${expected}, got ${actual.slice(0, 400)})`)
}

async function tapTestId(testId: string, timeoutMs = 30_000) {
  const nodes = await waitFor(
    (current) => findByTestId(current, testId)?.bounds !== undefined,
    { timeoutMs }
  )
  tapNode(findByTestId(nodes, testId)!)
}

async function storeReview() {
  // called state: the fixture mounts with an idle review request.
  launch('one-native-store-review')
  let nodes = await waitFor(
    (current) =>
      findByText(current, 'Status: idle') !== undefined &&
      findByText(current, 'Requests: 0') !== undefined,
    { timeoutMs: 60_000 }
  )
  check('store-review-mounted', screenText(nodes), 'Status: idle')

  // negative control: an unrelated control must not request a review.
  await tapTestId('one-native-store-review-alive')
  nodes = await waitFor((current) => findByText(current, 'Status: alive') !== undefined, {
    timeoutMs: 30_000,
  })
  check('store-review-negative-alive', screenText(nodes), 'Status: alive')
  check('store-review-negative-no-request', screenText(nodes), 'Requests: 0')

  // behavior: tapping request settles the Play review flow and records it.
  // the emulator carries the Play Store, so the flow resolves without UI.
  await tapTestId('one-native-store-review-request')
  nodes = await waitFor(
    (current) =>
      findByText(current, 'Status: requested') !== undefined ||
      findByText(current, 'Status: failed') !== undefined,
    { timeoutMs: 60_000 }
  )
  const settled = screenText(nodes)
  check('store-review-settled', settled, 'Status: requested')
  check('store-review-counted', settled, 'Requests: 1')

  // the app stays usable after the Play flow: no stuck dialog, no crash.
  await tapTestId('one-native-store-review-alive')
  nodes = await waitFor((current) => findByText(current, 'Status: alive') !== undefined, {
    timeoutMs: 30_000,
  })
  check('store-review-usable-after', screenText(nodes), 'Status: alive')
  check('store-review-count-kept', screenText(nodes), 'Requests: 1')
  writeFileSync(resolve(artifacts, 'store-review.txt'), screenText(nodes))
}

async function backgroundTasks() {
  // called state: the fixture mounts with a pending schedule readout.
  launch('one-native-background-tasks')
  let nodes = await waitFor(
    (current) => findByText(current, 'Schedule: pending') !== undefined,
    { timeoutMs: 60_000 }
  )
  check('background-tasks-mounted', screenText(nodes), 'Schedule: pending')

  // behavior: the WorkManager schedule round trip resolves, shows pending,
  // cancels, and the unknown identifier rejects with the input code, which
  // doubles as the negative control.
  await tapTestId('one-native-background-tasks-run')
  nodes = await waitFor((current) => screenText(current).includes('invalid='), {
    timeoutMs: 60_000,
  })
  const scheduled = screenText(nodes)
  check('background-tasks-refresh', scheduled, 'refresh=resolved pending=true cancelled=true')
  check('background-tasks-processing', scheduled, 'processing=resolved pending=true cancelled=true')
  check('background-tasks-negative-unknown', scheduled, 'invalid=E_BACKGROUND_TASK_INPUT')

  // injected delivery: the DEBUG hook launches the setup-file handler and
  // the read button reports what it ran.
  launchUrl('nativefeatures://background-task/refresh')
  await tapTestId('one-native-background-tasks-read')
  nodes = await waitFor((current) => screenText(current).includes('Callback: refresh:'), {
    timeoutMs: 30_000,
  })
  check('background-tasks-delivered', screenText(nodes), 'Callback: refresh:dev.vxrn.native.tests.refresh')

  // expiration: the processing handler waits for the abort signal, and the
  // expire hook aborts it.
  launchUrl('nativefeatures://background-task/processing')
  await sleep(2000)
  launchUrl('nativefeatures://background-task/expire')
  await tapTestId('one-native-background-tasks-read')
  nodes = await waitFor((current) => screenText(current).includes('Callback: expired:'), {
    timeoutMs: 30_000,
  })
  check('background-tasks-expired', screenText(nodes), 'Callback: expired:dev.vxrn.native.tests.processing')
  writeFileSync(resolve(artifacts, 'background-tasks.txt'), screenText(nodes))
}

function screencap(saveName: string): string {
  const out = execFileSync(
    ADB,
    ['-s', config.deviceId, 'exec-out', 'screencap', '-p'],
    { encoding: null, timeout: 60_000, maxBuffer: 64 * 1024 * 1024 }
  ) as Buffer
  const file = resolve(artifacts, saveName)
  writeFileSync(file, out)
  return file
}

function middleThirdDarkFraction(imagePath: string): number {
  // the status and navigation bars live outside the app window, so only the
  // middle third counts: FLAG_SECURE blanks the app window, never system UI.
  const image = readPng(imagePath)
  const top = Math.floor(image.height / 3)
  const bottom = Math.floor((image.height * 2) / 3)
  let dark = 0
  let total = 0
  for (let y = top; y < bottom; y += 6) {
    for (let x = 0; x < image.width; x += 6) {
      const offset = (y * image.width + x) * 4
      total += 1
      if (image.data[offset] < 40 && image.data[offset + 1] < 40 && image.data[offset + 2] < 40)
        dark += 1
    }
  }
  return total === 0 ? 0 : dark / total
}

async function screenCapturePrevent() {
  // mounted state: the fixture mounts with prevention idle and unheld.
  // a fresh install (and pm clear) prompts for nearby-devices on first
  // foreground; screen capture needs no nearby access, so deny it when
  // present. scoped to this suite: other suites manage their own prompts.
  launch('one-native-screen-capture')
  let nodes = await waitFor(
    (current) =>
      (findByText(current, 'Prevention: idle') !== undefined &&
        findByText(current, 'Prevention hold: idle') !== undefined) ||
      findByTestId(
        current,
        'com.android.permissioncontroller:id/permission_deny_button'
      ) !== undefined,
    { timeoutMs: 60_000 }
  )
  if (
    findByTestId(nodes, 'com.android.permissioncontroller:id/permission_deny_button') !==
    undefined
  ) {
    await tapTestId('com.android.permissioncontroller:id/permission_deny_button')
    nodes = await waitFor(
      (current) =>
        findByText(current, 'Prevention: idle') !== undefined &&
        findByText(current, 'Prevention hold: idle') !== undefined,
      { timeoutMs: 60_000 }
    )
  }
  check('screen-capture-prevent-mounted', screenText(nodes), 'Prevention: idle')
  check('screen-capture-prevent-mounted-unheld', screenText(nodes), 'Prevention hold: idle')

  // called state, refcount behavior, and the key negative, all through one run.
  await tapTestId('one-native-screen-capture-prevent-run')
  nodes = await waitFor((current) => screenText(current).includes('Prevention: done'), {
    timeoutMs: 60_000,
  })
  const text = screenText(nodes)
  check('screen-capture-prevent-initial', text, 'Prevent initial: false')
  check('screen-capture-prevent-active', text, 'Prevent active: true')
  check('screen-capture-prevent-kept', text, 'Prevent kept: true')
  check('screen-capture-prevent-released', text, 'Prevent released: false')
  check(
    'screen-capture-prevent-invalid',
    text,
    'Prevent invalid: ScreenCapture.prevent requires a non-empty string key'
  )
  check('screen-capture-prevent-restored', text, 'Prevent restored: false')

  // behavior: FLAG_SECURE blanks the app window in an adb screencap while
  // held, and the same pixels read light again after release.
  const baselineFile = screencap('screen-capture-prevent-baseline.png')
  const baselineDark = middleThirdDarkFraction(baselineFile)
  console.log(`screen-capture-prevent baseline dark fraction: ${baselineDark}`)
  if (baselineDark > 0.3)
    throw new Error(`expected a light baseline screen, got dark fraction ${baselineDark}`)
  await tapTestId('one-native-screen-capture-prevent-hold')
  nodes = await waitFor(
    (current) => findByText(current, 'Prevention hold: held true') !== undefined,
    { timeoutMs: 30_000 }
  )
  check('screen-capture-prevent-held', screenText(nodes), 'Prevention hold: held true')
  const heldFile = screencap('screen-capture-prevent-held.png')
  const heldDark = middleThirdDarkFraction(heldFile)
  console.log(`screen-capture-prevent held dark fraction: ${heldDark}`)
  if (heldDark < 0.9)
    throw new Error(`FLAG_SECURE did not blank the screen, dark fraction ${heldDark}`)
  await tapTestId('one-native-screen-capture-prevent-release')
  nodes = await waitFor(
    (current) => findByText(current, 'Prevention hold: released false') !== undefined,
    { timeoutMs: 30_000 }
  )
  check('screen-capture-prevent-released-hold', screenText(nodes), 'Prevention hold: released false')
  const releasedFile = screencap('screen-capture-prevent-released.png')
  const releasedDark = middleThirdDarkFraction(releasedFile)
  console.log(`screen-capture-prevent released dark fraction: ${releasedDark}`)
  if (releasedDark > 0.3)
    throw new Error(`release did not restore the screen, dark fraction ${releasedDark}`)
  console.log(
    `PASS FLAG_SECURE blanks and restores: baseline=${baselineDark} held=${heldDark} released=${releasedDark}`
  )

  // usePreventScreenCapture: a mounted guard alone sets FLAG_SECURE, its
  // unmount clears it, and a manual hold keeps it after the guard unmounts.
  // toggling resets the guard label to idle, so each check reads a fresh value.
  const toggleGuard = async () => {
    await tapTestId('one-native-screen-capture-guard-toggle')
    nodes = await waitFor(
      (current) => findByText(current, 'Guard check: idle') !== undefined,
      { timeoutMs: 30_000 }
    )
  }
  const checkGuard = async (name: string, expected: string, dark: 'blank' | 'light') => {
    await tapTestId('one-native-screen-capture-guard-check')
    nodes = await waitFor(
      (current) => findByText(current, `Guard check: ${expected}`) !== undefined,
      { timeoutMs: 30_000 }
    )
    check(name, screenText(nodes), `Guard check: ${expected}`)
    const fraction = middleThirdDarkFraction(screencap(`${name}.png`))
    console.log(`${name} dark fraction: ${fraction}`)
    if (dark === 'blank' ? fraction < 0.9 : fraction > 0.3)
      throw new Error(`${name}: expected a ${dark} screen, got dark fraction ${fraction}`)
  }
  await toggleGuard()
  await checkGuard('screen-capture-guard-mounted', 'mounted true', 'blank')
  await toggleGuard()
  await checkGuard('screen-capture-guard-unmounted', 'unmounted false', 'light')
  await toggleGuard()
  await tapTestId('one-native-screen-capture-prevent-hold')
  await waitFor(
    (current) => findByText(current, 'Prevention hold: held true') !== undefined,
    { timeoutMs: 30_000 }
  )
  await toggleGuard()
  await checkGuard('screen-capture-guard-unmounted-held', 'unmounted true', 'blank')
  await tapTestId('one-native-screen-capture-prevent-release')
  await waitFor(
    (current) => findByText(current, 'Prevention hold: released false') !== undefined,
    { timeoutMs: 30_000 }
  )
  await checkGuard('screen-capture-guard-released', 'unmounted false', 'light')
  writeFileSync(resolve(artifacts, 'screen-capture-prevent.txt'), screenText(nodes))
}

async function main() {
  if (!config.noInstall) {
    console.log(`installing ${config.apk}`)
    adb(['install', '-r', '-d', config.apk], 180_000)
    adb(['shell', 'pm', 'clear', PACKAGE])
  }
  if (config.installOnly) {
    console.log('install-only done')
    return
  }
  const suites =
    config.suite === 'all'
      ? ['store-review', 'background-tasks', 'screen-capture-prevent']
      : [config.suite]
  for (const suite of suites) {
    if (suite === 'store-review') await storeReview()
    else if (suite === 'background-tasks') await backgroundTasks()
    else if (suite === 'screen-capture-prevent') await screenCapturePrevent()
    else throw new Error(`unknown suite: ${suite}`)
  }
  console.log(`PASS one-native-android-services ${suites.join(',')}`)
  void adbQuiet
}

await main()
