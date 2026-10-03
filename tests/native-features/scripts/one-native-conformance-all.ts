#!/usr/bin/env bun
// runs the iPhone suites by default, the iPad sidebar suite, or the iOS 27.1
// Duo ArrangementView suite. the iPhone
// visual pass runs last and against the artifact root because several checks
// take their negative capture from a different suite's directory.
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { runAllVisualChecks } from './visual-verification'

const iphoneSuites = [
  'tabs-menu',
  'pickers',
  'forms',
  'sheets',
  'leaves',
  'dialogs',
  'host',
  'containers',
  'glass-container',
  'building-blocks',
  'view-slot',
  'swipe-actions',
  'disclosure-group',
  'control-group',
  'share-empty',
  'web-photos',
  'tab-slot',
  'tab-sidebar',
  'edit-button',
  'view-that-fits',
  'popover',
  'accessibility',
  'media',
  'map',
  'apple-file',
  'ui-map',
  'gpu',
] as const

const args = process.argv.slice(2)
const value = (name: string, fallback = '') => {
  const index = args.indexOf(name)
  return index === -1 ? fallback : args[index + 1] || ''
}
const simulatorId = value('--simulator-id')
const bundleId = value('--bundle-id')
const artifactDir = value('--artifact-dir', '/tmp/one-native-conformance')
const timeout = value('--timeout', '15000')
const device = value('--device', 'iphone')
const jsLocation = value('--js-location')
if (device !== 'iphone' && device !== 'ipad' && device !== 'duo')
  throw new Error('--device must be iphone, ipad, or duo')
const suites = device === 'ipad' ? ['tab-sidebar'] : device === 'duo' ? ['arrangement'] : iphoneSuites
if (!simulatorId || !bundleId) {
  console.log(
    'Usage: bun one-native-conformance-all.ts --simulator-id <UUID> --bundle-id <ID> [--device iphone|ipad|duo] [--js-location HOST:PORT] [--artifact-dir <PATH>] [--timeout <MS>]'
  )
  process.exit(1)
}

let total = 0
for (const suite of suites) {
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
        simulatorId,
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
