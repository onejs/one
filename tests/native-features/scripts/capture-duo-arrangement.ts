#!/usr/bin/env bun
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DUO_UDID = '3403FE1D-63F6-472A-AA72-F9B5CEF6885E'
const BUNDLE_ID = 'dev.vxrn.native.tests'
const OUT_DIR = '/tmp/duo-arrangement-evidence'

mkdirSync(OUT_DIR, { recursive: true })

function run(cmd: string, args: string[]) {
  console.log(`[exec] ${cmd} ${args.join(' ')}`)
  try {
    return execFileSync(cmd, args, { encoding: 'utf8' })
  } catch (err: any) {
    console.error(`[error] ${err.message}`)
    if (err.stdout) console.log(err.stdout)
    if (err.stderr) console.error(err.stderr)
    throw err
  }
}

function getDisplayPort(display: 'cover' | 'inner'): string {
  const pixelWidth = display === 'cover' ? 1398 : 2007
  const pixelHeight = display === 'cover' ? 2034 : 2853
  const out = run('xcrun', ['simctl', 'io', DUO_UDID, 'enumerate'])
  const block = out
    .split(/^Port:$/m)
    .find((b) => b.includes(`Default width: ${pixelWidth}`) && b.includes(`Default height: ${pixelHeight}`))
  const uuid = block?.match(/UUID: ([0-9A-F-]+)/)?.[1]
  if (uuid) return uuid
  return display === 'cover' ? 'primary' : 'primary-1'
}

export function captureScreenshots() {
  console.log(`=== Starting ArrangementView Duo Runtime Capture ===`)
  
  // 1. Launch test app
  console.log(`Launching ${BUNDLE_ID}...`)
  try {
    run('xcrun', ['simctl', 'launch', DUO_UDID, BUNDLE_ID])
  } catch {}

  // 2. Open ArrangementView route via deep links
  console.log(`Navigating to /one-native-arrangement...`)
  try {
    run('xcrun', ['simctl', 'openurl', DUO_UDID, 'nativefeatures://app/one-native-arrangement'])
  } catch {}
  try {
    run('xcrun', ['simctl', 'openurl', DUO_UDID, 'nativefeatures:///one-native-arrangement'])
  } catch {}

  // Allow app to settle
  execFileSync('sleep', ['2'])

  const coverPort = getDisplayPort('cover')
  const innerPort = getDisplayPort('inner')

  // Capture Closed (Cover display)
  const closedPath = join(OUT_DIR, 'duo-arrangement-closed.png')
  run('xcrun', ['simctl', 'io', DUO_UDID, 'screenshot', `--display=${coverPort}`, closedPath])
  console.log(`Captured Closed screenshot: ${closedPath}`)

  // Capture Inner display (Open / Book)
  const innerPath = join(OUT_DIR, 'duo-arrangement-inner.png')
  run('xcrun', ['simctl', 'io', DUO_UDID, 'screenshot', `--display=${innerPort}`, innerPath])
  console.log(`Captured Inner screenshot: ${innerPath}`)

  console.log(`=== Captures complete ===`)
  return { closedPath, innerPath }
}

if (import.meta.main) {
  captureScreenshots()
}
