#!/usr/bin/env bun
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

// Bounded remount-cycle memory probe for the One Native Android proof screen.
// Taps the optional-child toggle off/on per cycle (a real Fabric unmount/remount
// through OneNativeComposeNodeView.resetForReuse) and samples TOTAL PSS/USS via
// dumpsys meminfo. Reports the series plus a coarse growth guard. A short sample
// cannot prove leak freedom; it can only catch clear monotonic growth.

type Sample = { cycle: number; state: string; pssKb: number; privateDirtyKb: number }

function parse(args: string[]) {
  let deviceId = ''
  let packageId = ''
  let artifactDir = '/tmp/one-native-android-memory'
  let cycles = 12
  let timeout = 15_000
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--device-id' || arg === '--serial' || arg === '--adb-device')
      deviceId = args[++index] || ''
    else if (arg === '--package-id' || arg === '--bundle-id')
      packageId = args[++index] || ''
    else if (arg === '--artifact-dir') artifactDir = args[++index] || ''
    else if (arg === '--cycles') cycles = Number(args[++index])
    else if (arg === '--timeout') timeout = Number(args[++index])
    else throw new Error(`Unknown argument: ${arg}`)
  }
  if (!deviceId || !packageId || !Number.isInteger(cycles) || cycles <= 0)
    throw new Error('A device id, package id, and positive integer cycles are required.')
  return { deviceId, packageId, artifactDir, cycles, timeout }
}

function adb(deviceId: string, args: string[]) {
  return execFileSync('adb', ['-s', deviceId, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  })
}

function dump(deviceId: string) {
  const remote = `/sdcard/one-native-android-memory-${process.pid}.xml`
  adb(deviceId, ['shell', 'uiautomator', 'dump', remote])
  return adb(deviceId, ['exec-out', 'cat', remote])
}

function toggleCenter(xml: string) {
  const tag = xml.indexOf('one-native-android-toggle-optional')
  if (tag < 0) throw new Error('Toggle button not found in accessibility dump.')
  const window = xml.slice(tag, tag + 3000)
  const match = window.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
  if (!match) throw new Error('Toggle button has no usable bounds.')
  const [, left, top, right, bottom] = match.map(Number)
  return {
    x: Math.round((left + right) / 2),
    y: Math.round((top + bottom) / 2),
  }
}

function meminfo(deviceId: string, packageId: string): Omit<Sample, 'cycle' | 'state'> {
  const output = adb(deviceId, ['shell', 'dumpsys', 'meminfo', packageId])
  const match = output.match(/^\s*TOTAL\s+(\d+)\s+(\d+)/m)
  if (!match) throw new Error('Could not parse dumpsys meminfo TOTAL line.')
  return { pssKb: Number(match[1]), privateDirtyKb: Number(match[2]) }
}

async function waitState(
  deviceId: string,
  expected: string,
  timeout: number
): Promise<string> {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    const xml = dump(deviceId)
    if (xml.includes(expected)) return xml
    await Bun.sleep(250)
  }
  throw new Error(`Timed out waiting for "${expected}".`)
}

async function run() {
  const config = parse(process.argv.slice(2))
  mkdirSync(config.artifactDir, { recursive: true })
  const samples: Sample[] = []

  await waitState(config.deviceId, 'one-native-android-mounted', config.timeout)
  const coords = toggleCenter(dump(config.deviceId))

  for (let cycle = 1; cycle <= config.cycles; cycle++) {
    adb(config.deviceId, ['shell', 'input', 'tap', String(coords.x), String(coords.y)])
    await waitState(config.deviceId, 'Optional: unmounted', config.timeout)
    adb(config.deviceId, ['shell', 'input', 'tap', String(coords.x), String(coords.y)])
    const xml = await waitState(config.deviceId, 'Optional: mounted', config.timeout)
    const mountedCount = xml.split('one-native-android-optional-text').length - 1
    const memory = meminfo(config.deviceId, config.packageId)
    const state = `mountedCount=${mountedCount}`
    samples.push({ cycle, state, ...memory })
    console.log(
      `cycle ${cycle}: ${state} pss=${memory.pssKb}KB privateDirty=${memory.privateDirtyKb}KB`
    )
  }

  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
  }
  const first = median(samples.slice(0, 3).map((sample) => sample.pssKb))
  const last = median(samples.slice(-3).map((sample) => sample.pssKb))
  const growth = (last - first) / first
  const monotonic =
    samples.slice(-3).every((sample) => sample.pssKb > first) && growth > 0.2
  const report = {
    suite: 'one-native-android-memory',
    deviceId: config.deviceId,
    packageId: config.packageId,
    cycles: config.cycles,
    samples,
    firstMedianPssKb: first,
    lastMedianPssKb: last,
    growthRatio: growth,
    monotonicGrowthGuard: monotonic ? 'TRIPPED' : 'clear',
    note: 'A short remount sample cannot prove leak freedom; a tripped guard means investigate, not that a leak is proven.',
    completedAt: new Date().toISOString(),
  }
  writeFileSync(
    path.join(config.artifactDir, 'memory.json'),
    JSON.stringify(report, null, 2)
  )
  console.log(
    `memory pss first-median=${first}KB last-median=${last}KB growth=${(growth * 100).toFixed(1)}% guard=${report.monotonicGrowthGuard}`
  )
  if (monotonic) {
    console.error('FAIL one-native-android-memory: monotonic growth guard tripped.')
    process.exitCode = 1
  }
}

try {
  await run()
} catch (error) {
  console.error(
    `FAIL one-native-android-memory: ${error instanceof Error ? error.message : String(error)}`
  )
  process.exitCode = 1
}
