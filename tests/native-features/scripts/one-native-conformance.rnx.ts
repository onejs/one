import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

type JsonRecord = Record<string, any>

const args = process.argv.slice(2)
const option = (name: string) => {
  const index = args.indexOf(name)
  if (index === -1 || !args[index + 1]) throw new Error(`Missing ${name}`)
  return args[index + 1]
}

const sim = option('--sim')
const url = option('--url')
const runs = Number(args.includes('--runs') ? option('--runs') : '3')
const artifactRoot = resolve(
  args.includes('--artifact-dir')
    ? option('--artifact-dir')
    : '/tmp/one-native-rnx-conformance'
)

if (!Number.isInteger(runs) || runs < 2) {
  throw new Error('--runs must be an integer of at least 2')
}

const knownArguments = new Set(['--sim', '--url', '--runs', '--artifact-dir'])
for (let index = 0; index < args.length; index += 2) {
  if (!knownArguments.has(args[index]))
    throw new Error(`Unknown argument: ${args[index]}`)
}

mkdirSync(artifactRoot, { recursive: true })

const run = (commandArgs: string[], outputPath?: string) => {
  const rnxArgs =
    commandArgs[0] === 'device'
      ? [...commandArgs, '--sim', sim]
      : ['--sim', sim, ...commandArgs]
  const result = spawnSync('rnx', rnxArgs, {
    cwd: resolve(import.meta.dirname, '..'),
    encoding: 'utf8',
    env: { ...process.env, RNX_AGENT: '1' },
  })
  const transcript = [result.stdout, result.stderr].filter(Boolean).join('\n')
  if (outputPath) writeFileSync(outputPath, transcript)
  if (result.status !== 0) {
    throw new Error(
      `rnx ${commandArgs.join(' ')} failed (${result.status})\n${transcript}`
    )
  }
  return result.stdout.trim()
}

const captureJson = (commandArgs: string[], outputPath: string) => {
  const stdout = run(commandArgs, `${outputPath}.log`)
  const value = JSON.parse(stdout)
  writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`)
  return value
}

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message)
}

const collectRecords = (value: unknown): JsonRecord[] => {
  if (Array.isArray(value)) return value.flatMap(collectRecords)
  if (!value || typeof value !== 'object') return []
  const record = value as JsonRecord
  return [record, ...Object.values(record).flatMap(collectRecords)]
}

const byTestID = (records: JsonRecord[], testID: string) => {
  const matches = records.filter((record) => record.testID === testID)
  assert(matches.length === 1, `Expected exactly one ${testID}, found ${matches.length}`)
  return matches[0]
}

const textOf = (record: JsonRecord) => String(record.text ?? record.label ?? '')
const boxOf = (record: JsonRecord) => {
  const box = record.box ?? record.geometry ?? record
  return {
    x: Number(box.x),
    y: Number(box.y),
    w: Number(box.w ?? box.width),
    h: Number(box.h ?? box.height),
  }
}

const assertText = (records: JsonRecord[], testID: string, text: string) => {
  assert(textOf(byTestID(records, testID)) === text, `${testID} did not equal "${text}"`)
}

const assertInitial = (tree: unknown, boxes: unknown, layout: unknown, a11y: unknown) => {
  const treeRecords = collectRecords(tree)
  const boxRecords = collectRecords(boxes)
  const layoutRecords = collectRecords(layout)
  const a11yRecords = collectRecords(a11y)

  assertText(treeRecords, 'one-native-android-mounted', 'Android proof mounted')
  assertText(treeRecords, 'one-native-android-prop-status', 'Prop: compact')
  assertText(treeRecords, 'one-native-android-prop-value', 'Compact prop')
  assertText(treeRecords, 'one-native-android-button-status', 'Button taps: 0')
  assertText(
    treeRecords,
    'one-native-android-switch-status',
    'Switch: off · Request: off · Revision: 0'
  )
  assertText(treeRecords, 'one-native-android-switch-policy-status', 'Policy: reject')
  assertText(treeRecords, 'one-native-android-lifecycle-status', 'Optional: mounted')
  assertText(
    treeRecords,
    'one-native-android-disabled-status',
    'Disabled button taps: 0 · Disabled switch taps: 0'
  )

  const screen = boxOf(byTestID(boxRecords, 'one-native-android-screen'))
  const bounds = boxOf(byTestID(boxRecords, 'one-native-android-bounds-box'))
  assert(screen.w > 0 && screen.h > 0, 'Column must fill a visible screen')
  assert(
    bounds.w === 96 && bounds.h === 36,
    `Initial Box must be 96x36, got ${bounds.w}x${bounds.h}`
  )

  const screenLayout = byTestID(layoutRecords, 'one-native-android-screen')
  const boundsLayout = byTestID(layoutRecords, 'one-native-android-bounds-box')
  assert(
    JSON.stringify(screenLayout.padding) === JSON.stringify({ t: 8, r: 8, b: 8, l: 8 }),
    `Column composeStyle padding must be 8: ${JSON.stringify(screenLayout.padding)}`
  )
  assert(Number(boundsLayout.borderRadius) === 8, 'Nested Box cornerRadius must be 8')
  assert(Number(boundsLayout.borderWidth) === 1, 'Nested Box borderWidth must be 1')
  assert(
    JSON.stringify(boundsLayout.padding) === JSON.stringify({ t: 6, r: 6, b: 6, l: 6 }),
    `Nested Box padding must be 6: ${JSON.stringify(boundsLayout.padding)}`
  )
  assert(Boolean(boundsLayout.bg), 'Nested Box must expose its background color')

  const mounted = boxOf(byTestID(boxRecords, 'one-native-android-mounted'))
  const propStatus = boxOf(byTestID(boxRecords, 'one-native-android-prop-status'))
  assert(propStatus.y - (mounted.y + mounted.h) === 4, 'Column spacing must be 4')

  for (const rowID of [
    'one-native-android-button-row',
    'one-native-android-switch-row',
    'one-native-android-disabled-row',
    'one-native-android-order-row',
  ]) {
    const row = boxOf(byTestID(boxRecords, rowID))
    assert(row.w === screen.w - 16, `${rowID} must fill the Column inside its padding`)
  }

  const button = boxOf(byTestID(boxRecords, 'one-native-android-real-button'))
  const reorder = boxOf(byTestID(boxRecords, 'one-native-android-reorder'))
  assert(reorder.x - (button.x + button.w) === 8, 'Row spacing must be 8')

  const nestedText = boxOf(byTestID(boxRecords, 'one-native-android-prop-value'))
  assert(
    nestedText.x >= bounds.x + 6 &&
      nestedText.y >= bounds.y + 6 &&
      nestedText.x + nestedText.w <= bounds.x + bounds.w - 6 &&
      nestedText.y + nestedText.h <= bounds.y + bounds.h - 6,
    'Nested Text must remain inside Box composeStyle padding'
  )

  const screenA11y = byTestID(a11yRecords, 'one-native-android-screen')
  const mountedA11y = byTestID(a11yRecords, 'one-native-android-mounted')
  const buttonA11y = byTestID(a11yRecords, 'one-native-android-real-button')
  const switchA11y = byTestID(a11yRecords, 'one-native-android-switch')
  const disabledButtonA11y = byTestID(a11yRecords, 'one-native-android-disabled-button')
  const disabledSwitchA11y = byTestID(a11yRecords, 'one-native-android-disabled-switch')
  const decoyA11y = byTestID(a11yRecords, 'one-native-android-decoy')
  assert(
    screenA11y.label === 'One Native Android proof',
    'Column accessibility label must match'
  )
  assert(
    mountedA11y.role === 'header' && mountedA11y.label === 'Android proof mounted',
    'Text header accessibility must match'
  )
  assert(
    buttonA11y.role === 'button' && buttonA11y.label === 'Tap button',
    'Button accessibility must match'
  )
  assert(
    switchA11y.role === 'switch' && switchA11y.label === 'Controlled switch',
    'Switch accessibility must match'
  )
  assert(
    disabledButtonA11y.role === 'button' &&
      disabledButtonA11y.label === 'Disabled button',
    'Disabled Button accessibility must match'
  )
  assert(
    disabledSwitchA11y.role === 'switch' &&
      disabledSwitchA11y.label === 'Disabled switch',
    'Disabled Switch accessibility must match'
  )
  assert(
    disabledButtonA11y.state?.disabled === true,
    'Disabled Button must expose disabled state'
  )
  assert(
    disabledSwitchA11y.state?.disabled === true,
    'Disabled Switch must expose disabled state'
  )
  assert(
    switchA11y.state?.checked === false,
    'Controlled Switch must initially expose checked false'
  )
  assert(
    decoyA11y.label === 'Tap real button' && decoyA11y.role !== 'button',
    'Decoy Box must keep its label without exposing the Button role'
  )

  const treeButton = byTestID(treeRecords, 'one-native-android-real-button')
  const treeDecoy = byTestID(treeRecords, 'one-native-android-decoy')
  assert(treeButton.pressable === true, 'Real Button must be pressable')
  assert(treeDecoy.pressable !== true, 'Decoy Box must not be pressable')
}

const assertFinal = (tree: unknown, boxes: unknown, a11y: unknown) => {
  const treeRecords = collectRecords(tree)
  const boxRecords = collectRecords(boxes)
  const a11yRecords = collectRecords(a11y)

  assertText(treeRecords, 'one-native-android-prop-status', 'Prop: expanded')
  assertText(
    treeRecords,
    'one-native-android-prop-value',
    'Expanded Android Compose text prop'
  )
  assertText(treeRecords, 'one-native-android-button-status', 'Button taps: 2')
  assertText(
    treeRecords,
    'one-native-android-switch-status',
    'Switch: off · Request: off · Revision: 1'
  )
  assertText(treeRecords, 'one-native-android-switch-policy-status', 'Policy: accept')
  assertText(treeRecords, 'one-native-android-lifecycle-status', 'Optional: mounted')
  assertText(
    treeRecords,
    'one-native-android-disabled-status',
    'Disabled button taps: 0 · Disabled switch taps: 0'
  )

  const bounds = boxOf(byTestID(boxRecords, 'one-native-android-bounds-box'))
  assert(
    bounds.w === 248 && bounds.h === 36,
    `Revised Box must be 248x36, got ${bounds.w}x${bounds.h}`
  )

  const beta = treeRecords.findIndex(
    (record) => record.testID === 'one-native-android-order-beta'
  )
  const alpha = treeRecords.findIndex(
    (record) => record.testID === 'one-native-android-order-alpha'
  )
  assert(
    beta !== -1 && alpha !== -1 && beta < alpha,
    'Keyed Row must publish beta before alpha after reorder'
  )
  assert(
    treeRecords.filter((record) => record.testID === 'one-native-android-optional')
      .length === 1,
    'Remounted optional Box must appear exactly once'
  )

  const switchA11y = byTestID(a11yRecords, 'one-native-android-switch')
  assert(switchA11y.state?.checked === false, 'Reset revision must publish Switch off')
}

const device = run(['device', 'get'])
assert(
  device.toLowerCase().includes('pixel-8'),
  `Expected a pixel-8 simulator, got:\n${device}`
)
writeFileSync(resolve(artifactRoot, 'device.txt'), `${device}\n`)

const initialFlow = resolve(
  import.meta.dirname,
  '../maestro/one-native-android-initial.yaml'
)
const behaviorFlow = resolve(
  import.meta.dirname,
  '../maestro/one-native-android-behavior.yaml'
)
const completedRuns: JsonRecord[] = []

for (let index = 1; index <= runs; index++) {
  const runDirectory = resolve(artifactRoot, `run-${index}`)
  const initialDirectory = resolve(runDirectory, 'initial')
  const finalDirectory = resolve(runDirectory, 'final')
  mkdirSync(initialDirectory, { recursive: true })
  mkdirSync(finalDirectory, { recursive: true })

  run(['get', 'errors', 'clear'])
  run(['get', 'requests', 'clear'])
  run(
    ['maestro', 'test', initialFlow, '--url', url, '--out', initialDirectory],
    resolve(initialDirectory, 'maestro.log')
  )

  const initialTree = captureJson(
    ['get', 'tree', '20', '--json'],
    resolve(initialDirectory, 'tree.json')
  )
  const initialBoxes = captureJson(
    ['get', 'tree', '20', '--boxes', '--json'],
    resolve(initialDirectory, 'boxes.json')
  )
  const initialLayout = captureJson(
    ['get', 'layout', '--styling', '--json'],
    resolve(initialDirectory, 'layout.json')
  )
  const initialA11y = captureJson(
    ['get', 'a11y', '20', '--json'],
    resolve(initialDirectory, 'a11y.json')
  )
  assertInitial(initialTree, initialBoxes, initialLayout, initialA11y)

  run(
    ['maestro', 'test', behaviorFlow, '--url', url, '--out', finalDirectory],
    resolve(finalDirectory, 'maestro.log')
  )

  const finalTree = captureJson(
    ['get', 'tree', '20', '--json'],
    resolve(finalDirectory, 'tree.json')
  )
  const finalBoxes = captureJson(
    ['get', 'tree', '20', '--boxes', '--json'],
    resolve(finalDirectory, 'boxes.json')
  )
  const finalA11y = captureJson(
    ['get', 'a11y', '20', '--json'],
    resolve(finalDirectory, 'a11y.json')
  )
  assertFinal(finalTree, finalBoxes, finalA11y)

  const errors = captureJson(
    ['get', 'errors', '20', '--json'],
    resolve(finalDirectory, 'errors.json')
  )
  const requests = captureJson(
    ['get', 'requests', '20', '--json'],
    resolve(finalDirectory, 'requests.json')
  )
  assert(
    Array.isArray(errors) && errors.length === 0,
    `Run ${index} reported console errors`
  )
  assert(
    Array.isArray(requests) && requests.length === 0,
    `Run ${index} reported failed requests`
  )
  run(
    ['screenshot', '--output', resolve(finalDirectory, 'supporting.png')],
    resolve(finalDirectory, 'screenshot.log')
  )

  const outcome = { run: index, passed: true }
  completedRuns.push(outcome)
  writeFileSync(
    resolve(runDirectory, 'outcome.json'),
    `${JSON.stringify(outcome, null, 2)}\n`
  )
}

writeFileSync(
  resolve(artifactRoot, 'outcome.json'),
  `${JSON.stringify({ passed: true, sim, url, runs: completedRuns }, null, 2)}\n`
)
console.log(`One Native RNX conformance passed ${runs} runs. Artifacts: ${artifactRoot}`)
