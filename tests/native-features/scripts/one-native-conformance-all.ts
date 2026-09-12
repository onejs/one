#!/usr/bin/env bun
// runs every conformance suite, then the visual pass. the visual pass runs last and against the
// artifact root rather than per suite, because several checks take their negative capture from a
// different suite's directory and can only resolve once every suite has written its screenshots.
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { runAllVisualChecks } from './visual-verification'

const suites = [
  'tabs-menu', 'pickers', 'forms', 'sheets', 'leaves', 'dialogs',
  'host', 'containers', 'popover', 'accessibility', 'media', 'map',
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
if (!simulatorId || !bundleId) {
  console.log(
    'Usage: bun one-native-conformance-all.ts --simulator-id <UUID> --bundle-id <ID> [--artifact-dir <PATH>] [--timeout <MS>]'
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
      [new URL('./one-native-conformance.ts', import.meta.url).pathname,
       '--suite', suite, '--simulator-id', simulatorId, '--bundle-id', bundleId,
       '--artifact-dir', dir, '--timeout', timeout],
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

const visual = await runAllVisualChecks({ captureDir: artifactDir })
const failed = visual.filter((check) => !check.passed)
for (const check of failed) console.log(`FAIL visual ${check.name}: ${check.error}`)
console.log(
  `TOTAL ${total} accessibility checks, ${visual.length - failed.length}/${visual.length} visual checks`
)
if (failed.length) process.exit(1)
