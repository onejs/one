import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const platform = process.env.PLATFORM
const device = process.env.DEVICE
assert(platform === 'ios' || platform === 'android', 'PLATFORM must be ios or android')
assert(device, 'DEVICE must name the leased device')
const rally = process.argv.includes('--rally')
const mode = `${rally ? 'rally' : 'contract'}-${platform}`
const artifacts = resolve(process.env.ARTIFACTS ?? '/tmp/one-background-native-proof')
mkdirSync(artifacts, { recursive: true })
const run = (command: string, args: string[]) =>
  execFileSync(command, args, { encoding: 'utf8', timeout: 30_000 })
let text: string
if (platform === 'ios') {
  const snapshot = run('xcodebuildmcp', [
    'simulator',
    'snapshot-ui',
    '--simulator-id',
    device,
    '--output',
    'json',
  ])
  const result = JSON.parse(snapshot)
  assert.equal(result.didError, false)
  text = result.data.capture.text.join('\n')
  writeFileSync(resolve(artifacts, `${mode}.json`), snapshot)
} else {
  const adb = process.env.ADB ?? 'adb'
  run(adb, [
    '-s',
    device,
    'shell',
    'uiautomator',
    'dump',
    '/sdcard/one-background-proof.xml',
  ])
  text = run(adb, ['-s', device, 'shell', 'cat', '/sdcard/one-background-proof.xml'])
  writeFileSync(resolve(artifacts, `${mode}.xml`), text)
}
const expected = rally
  ? 'passed revision=1 checkpoints=3 legs=3 objects=37'
  : 'latest=3 value=6 runtime=worklet error=handled dispose=silent'
assert(text.includes(expected), `expected ${expected}, received ${text}`)
if (!rally)
  assert(text.includes('hook=14 current=true'), 'hook must publish its current result')
assert(
  !/Render Error|Uncaught Error|Unable to load script|Dismiss/i.test(text),
  'native screen must not contain a redbox'
)
console.log(`RAN: ${platform} ${expected}`)
