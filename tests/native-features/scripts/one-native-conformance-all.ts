#!/usr/bin/env bun
// routes iphone suites to their calibrated iphone 16 or iphone 17 pro,
// or runs the ipad sidebar or ios 27.1 duo arrangementview suite. the iphone
// visual pass runs last and against the artifact root because several checks
// take their negative capture from a different suite's directory.
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { runAllVisualChecks } from './visual-verification'

const iphoneSuites = [
  ['tabs-menu', 'iphone16'],
  ['pickers', 'iphone16'],
  ['forms', 'iphone16'],
  ['sheets', 'iphone16'],
  ['leaves', 'iphone16'],
  ['dialogs', 'iphone16'],
  ['host', 'iphone16'],
  ['containers', 'iphone16'],
  ['glass-container', 'iphone16'],
  ['building-blocks', 'iphone16'],
  ['view-slot', 'iphone16'],
  ['swipe-actions', 'iphone16'],
  ['disclosure-group', 'iphone16'],
  ['control-group', 'iphone16'],
  ['share-empty', 'iphone16'],
  ['web-photos', 'iphone16'],
  ['tab-slot', 'iphone16'],
  ['tab-sidebar', 'iphone16'],
  ['edit-button', 'iphone16'],
  ['view-that-fits', 'iphone16'],
  ['popover', 'iphone16'],
  ['accessibility', 'iphone16'],
  ['media', 'iphone16'],
  ['map', 'iphone16'],
  ['apple-file', 'iphone17Pro'],
  ['ui-map', 'iphone16'],
  ['ui-icon', 'iphone16'],
  ['adaptive-flat', 'iphone16'],
  ['ui-effects', 'iphone16'],
  ['zoom', 'iphone16'],
  ['gpu', 'iphone16'],
] as const

const args = process.argv.slice(2)
const value = (name: string, fallback = '') => {
  const index = args.indexOf(name)
  return index === -1 ? fallback : args[index + 1] || ''
}
const simulatorId = value('--simulator-id')
const iphone16SimulatorId = value('--iphone16-simulator-id')
const iphone17ProSimulatorId = value('--iphone17-pro-simulator-id')
const bundleId = value('--bundle-id')
const artifactDir = value('--artifact-dir', '/tmp/one-native-conformance')
const timeout = value('--timeout', '15000')
const device = value('--device', 'iphone')
const jsLocation = value('--js-location')
if (device !== 'iphone' && device !== 'ipad' && device !== 'duo')
  throw new Error('--device must be iphone, ipad, or duo')
const suites: readonly (readonly [string, string])[] =
  device === 'iphone'
    ? iphoneSuites.map(([suite, calibratedDevice]) => [
        suite,
        calibratedDevice === 'iphone16' ? iphone16SimulatorId : iphone17ProSimulatorId,
      ] as const)
    : [[device === 'ipad' ? 'tab-sidebar' : 'arrangement', simulatorId] as const]
if (!bundleId || suites.some(([, id]) => !id)) {
  console.log(
    'Usage: bun one-native-conformance-all.ts --bundle-id <ID> (--iphone16-simulator-id <UUID> --iphone17-pro-simulator-id <UUID> | --device ipad|duo --simulator-id <UUID>) [--js-location HOST:PORT] [--artifact-dir <PATH>] [--timeout <MS>]'
  )
  process.exit(1)
}

if (device === 'iphone' && iphone16SimulatorId === iphone17ProSimulatorId)
  throw new Error('The iPhone 16 and iPhone 17 Pro simulator IDs must be distinct.')

let total = 0
for (const [suite, suiteSimulatorId] of suites) {
  const dir = join(artifactDir, suite)
  mkdirSync(dir, { recursive: true })
  try {
    const out = execFileSync(
      'bun',
      [
        new URL('./one-native-conformance.ts', import.meta.url).pathname,
        '--suite',
        suite,
        '--simulator-id',
        suiteSimulatorId,
        '--bundle-id',
        bundleId,
        '--artifact-dir',
        dir,
        '--timeout',
        timeout,
        ...(jsLocation ? ['--js-location', jsLocation] : []),
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    )
    const passed = out.split('\n').filter((line) => line.startsWith('PASS')).length
    total += passed
    console.log(`OK ${suite} ${passed} checks`)
  } catch (error) {
    const result = error as { stdout?: string; stderr?: string }
    console.log(`FAIL ${suite}`)
    console.log((result.stdout || '') + (result.stderr || ''))
    process.exit(1)
  }
}

if (device !== 'iphone') {
  console.log(`TOTAL ${total} ${device} accessibility checks`)
  process.exit(0)
}

const visual = await runAllVisualChecks({ captureDir: artifactDir })
const failed = visual.filter((check) => !check.passed)
for (const check of failed) console.log(`FAIL visual ${check.name}: ${check.error}`)
console.log(
  `TOTAL ${total} accessibility checks, ${visual.length - failed.length}/${visual.length} visual checks`
)
if (failed.length) process.exit(1)
