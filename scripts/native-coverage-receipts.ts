// validate saved runtime receipts outside Git; fixture references alone prove no run.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { iosExternalAcceptanceAPIs } from '../tests/native-features/fixtures/realapps-api-coverage'

const directory = process.argv[2]
assert(
  directory,
  'Expected an evidence root containing uniform-native-modules/ and realapps/'
)
const read = (path: string) => JSON.parse(readFileSync(resolve(directory, path), 'utf8'))

for (const platform of ['android', 'ios']) {
  const root = `uniform-native-modules/${platform}`
  const runtime = read(`${root}/runtime.json`)
  const pixels = read(`${root}/pixels.json`)
  assert.equal(runtime.platform, platform, `${platform} runtime identity`)
  assert.equal(runtime.passed, true, `${platform} native module contract`)
  assert.equal(pixels.passed, true, `${platform} independently decoded pixels`)
  assert.equal(pixels.counterclockwiseNegativeControlRejected, true)
  if (platform === 'android') {
    assert.equal(runtime.unavailable.passed, true, 'Android no-native service contract')
    assert(runtime.unavailable.checks.length > 60)
  }
}

const external = 'realapps/share-cancel-controls'
const receipt = read(`${external}/restored-positive/receipt.json`)
const results = read(`${external}/restored-positive/api-results.json`)
const run = read(`${external}/restored-positive/run-result.json`)
assert.equal(receipt.platform, 'ios')
assert.equal(receipt.mode, 'external')
assert.deepEqual(receipt.apis, iosExternalAcceptanceAPIs)
assert.equal(run.exitCode, 0)
for (const api of iosExternalAcceptanceAPIs) {
  assert.equal(results[api].status, 'observed', `${api} external result`)
}
const copy = read(`${external}/copy/api-results.json`)
assert.equal(copy['One.openShare.nativeActivity'].value.action, 'sharedAction')
assert.equal(results['One.openShare.nativeActivity'].value.action, 'dismissedAction')
for (const api of ['One.openURL', 'One.openSettings']) {
  const states = results[`${api}.appStates`].value.states
  assert(states.indexOf('background') >= 0)
  assert(states.slice(states.indexOf('background') + 1).includes('active'))
}
for (const control of ['negative-url', 'negative-settings']) {
  assert.equal(read(`${external}/${control}/run-result.json`).exitCode, 1)
}

console.info('Saved native module and bounded iOS external receipts passed')
