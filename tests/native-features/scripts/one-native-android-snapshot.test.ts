import { mock, test } from 'bun:test'
import { expect } from 'bun:test'

// adb is scripted per test: uiautomator dump steps run down dumpScript
// ('fail' throws the busy-system signature, 'ok' dumps dumpedXml), taps and
// swipes are recorded. anything else fails loudly as unstubbed.
type DumpStep = 'fail' | 'ok'
let dumpScript: DumpStep[] = []
let dumpedXml = ''
let dumpCalls = 0
const taps: string[][] = []
const swipes: string[][] = []

function dispatchExec(args: unknown[]) {
  const [command, rest] = args as [string, string[]]
  if (command !== 'adb') throw new Error(`unstubbed command: ${String(command)}`)
  const deviceArgs = rest.slice(2)
  const head = deviceArgs.slice(0, 3).join(' ')
  if (head === 'shell rm -f') return ''
  if (deviceArgs.slice(0, 2).join(' ') === 'exec-out cat') return dumpedXml
  if (head === 'shell uiautomator dump') {
    dumpCalls += 1
    const step = dumpScript.length ? dumpScript.shift()! : 'ok'
    if (step === 'fail')
      throw new Error('Command failed: Error: Unable to dump window hierarchy')
    return 'UI hierchary dumped to: /sdcard/one.xml'
  }
  if (head === 'shell input tap') {
    taps.push(deviceArgs.slice(3))
    return ''
  }
  if (head === 'shell input swipe') {
    swipes.push(deviceArgs.slice(3))
    return ''
  }
  throw new Error(`unstubbed adb: ${deviceArgs.join(' ')}`)
}

mock.module('node:child_process', () => ({
  execFileSync: (...args: unknown[]) => dispatchExec(args),
}))

import {
  awaitSnapshot,
  snapshot,
  swipeAwaited,
  tapAwaited,
  waitFor,
  type Config,
} from './one-native-conformance.android'

const config: Config = {
  deviceId: 'test-device',
  packageId: 'dev.one.test',
  artifactDir: '/tmp/one-android-snapshot-test',
  timeout: 5_000,
  metroPort: 8081,
  suite: 'system',
  apkPath: '',
  negativeControl: false,
}

function reset(dump: DumpStep[], xml: string) {
  dumpScript = [...dump]
  dumpedXml = xml
  dumpCalls = 0
  taps.length = 0
  swipes.length = 0
}

const node = (attrs: string) => `<node ${attrs} />`
const frame = (attrs: string, children = '') =>
  `<hierarchy rotation="0"><node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="dev.one.test" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[0,0][1080,2400]" ${attrs}>${children}</node></hierarchy>`

const readyXml = frame(
  '',
  node(
    'index="0" text="ready" resource-id="ready-marker" class="android.widget.TextView" package="dev.one.test" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[10,10][100,100]"'
  )
)
const emptyXml = '<hierarchy rotation="0"></hierarchy>'
const redboxXml = frame(
  '',
  node(
    'index="0" text="RedBox: Invariant Violation" resource-id="" class="android.widget.TextView" package="dev.one.test" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[10,10][100,100]"'
  )
)

test('snapshot attempts one dump and surfaces a transient failure immediately', () => {
  reset(['fail', 'ok'], readyXml)
  expect(() => snapshot(config)).toThrow(/uiautomator dump/)
  expect(dumpCalls).toBe(1)
})

test('snapshot keeps the redbox and empty-tree verdicts', () => {
  reset(['ok'], redboxXml)
  expect(() => snapshot(config)).toThrow(/RedBox/)
  reset(['ok'], emptyXml)
  expect(() => snapshot(config)).toThrow(/contained no nodes/)
})

test('waitFor tolerates transient dumps while awaiting its condition', async () => {
  reset(['fail', 'fail', 'ok'], readyXml)
  const result = await waitFor(
    config,
    'ready marker',
    (nodes) => nodes.some((entry) => entry.text === 'ready'),
    undefined,
    5_000
  )
  expect(result.snapshot.nodes.some((entry) => entry.text === 'ready')).toBe(true)
  expect(dumpCalls).toBe(3)
})

test('waitFor reports the failed predicate and observes whether its mount marker is absent', async () => {
  reset(['ok'], readyXml)
  for (const marker of ['ready-marker', 'absent-marker']) {
    const error = await waitFor(
      config,
      'speech-session-b-opens',
      () => false,
      marker,
      100
    ).then(
      () => null,
      (error: Error) => error
    )
    expect(error?.message).toContain('failed: speech-session-b-opens predicate')
    if (marker === 'ready-marker') {
      expect(error?.message).not.toContain('mount marker')
    } else {
      expect(error?.message).toContain('mount marker absent-marker: 0 matches')
    }
  }
})

test('awaitSnapshot awaits a valid dump through transient failures', async () => {
  reset(['fail', 'ok'], readyXml)
  const current = await awaitSnapshot(config, 'awaited dump', 5_000)
  expect(current.nodes.some((entry) => entry.text === 'ready')).toBe(true)
  expect(dumpCalls).toBe(2)
})

const buttonXml = frame(
  '',
  node(
    'index="0" text="Run" resource-id="tap-me" class="android.widget.Button" package="dev.one.test" content-desc="" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[0,0][100,200]"'
  )
)

test('tapAwaited awaits its target through transient dumps, then taps it', async () => {
  reset(['fail', 'ok'], buttonXml)
  await tapAwaited(config, 'awaited tap', { id: 'tap-me', role: 'button', clickable: true })
  expect(dumpCalls).toBe(2)
  expect(taps).toEqual([['50', '100']])
})

const scrollerXml = frame(
  'scrollable="true"',
  node(
    'index="0" text="row" resource-id="row" class="android.widget.TextView" package="dev.one.test" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[10,10][100,100]"'
  )
)

test('swipeAwaited awaits the scroller through transient dumps, then swipes', async () => {
  reset(['fail', 'ok'], scrollerXml)
  await swipeAwaited(config, 'awaited swipe')
  expect(dumpCalls).toBe(2)
  expect(swipes).toEqual([['540', '1728', '540', '720', '250']])
})
