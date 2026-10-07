import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
const root = '/Users/n8/.worktrees/one-native-network-proof'
const app = '/tmp/one-network-proof-app'
const logs = '/Users/n8/Library/Logs/one-network-hook-proof'
const fixture = `${app}/app/one-native-network.tsx`
const canonical = readFileSync(`${root}/tests/native-features/fixtures/one-native-network.tsx`, 'utf8')
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex')
const simulator = 'A9BF26C8-2214-4DC6-AA9E-877B19A49FE9'
try {
 for (const name of ['positive', 'omitted-hook', 'restored-positive']) {
  const dir = `${logs}/${name}`
  mkdirSync(dir, { recursive: true })
  const modified = name === 'omitted-hook' ? canonical.replace('const live = useNetworkState()', "const live = { type: 'unknown', isConnected: false, isInternetReachable: false }") : canonical
  writeFileSync(fixture, modified)
  const response = await fetch('http://localhost:8097/index.bundle?platform=ios&dev=true')
  if (!response.ok) throw new Error(`Bundle ${response.status}: ${await response.text()}`)
  const bundle = Buffer.from(await response.arrayBuffer())
  writeFileSync(`${logs}/${name}-bundle.js`, bundle)
  const hbcResponse = await fetch('http://localhost:8097/.expo/.virtual-metro-entry.bundle?platform=ios&dev=true&bytecode=hermes')
  if (!hbcResponse.ok) throw new Error(`Hermes bundle ${hbcResponse.status}`)
  const hbc = Buffer.from(await hbcResponse.arrayBuffer())
  if (hbc.subarray(0, 8).toString('hex') !== 'c61fbc03c103191f') throw new Error('Invalid Hermes header')
  writeFileSync(`${logs}/${name}-bundle.hbc`, hbc)
  if (!bundle.includes(Buffer.from('sawEvent'))) throw new Error('Worktree hook guard missing from emitted bundle')
  writeFileSync(`${dir}/identity.json`, JSON.stringify({
    sourceCommit: (await Bun.$`git -C ${root} rev-parse HEAD`.text()).trim(),
    device: simulator, deviceName: 'iPhone 17 Pro', runtime: 'iOS 27.0', runtimeBuild: '24A434', appId: 'com.natew.oneexample',
    nativeBuildOrigin: 'pro-64 installed OneBasic.app on 0FC55879-D544-420F-8BBD-521C9268E14A, reused from /tmp/p67471-OneBasic.app authenticated by p67471; no rebuild and no attribution to current source HEAD',
    executableSHA256: sha('/tmp/p67471-OneBasic.app/OneBasic'), debugDylibSHA256: sha('/tmp/p67471-OneBasic.app/OneBasic.debug.dylib'),
    sourceSHA256: sha(`${root}/packages/one/src/platform/network/index.native.ts`),
    oldPrimaryDistSHA256: sha('/Users/n8/one/packages/one/dist/esm/platform/network/index.native.js'),
    boundTranspiledSHA256: sha(`${logs}/network.transpiled.js`),
    fixtureSHA256: sha(fixture), canonicalFixtureSHA256: createHash('sha256').update(canonical).digest('hex'),
    runnerSHA256: sha(`${root}/tests/native-features/scripts/one-native-conformance.ts`),
    bundleSHA256: createHash('sha256').update(bundle).digest('hex'), bundleBytes: bundle.length, hermesBundleSHA256: createHash('sha256').update(hbc).digest('hex'), hermesBundleBytes: hbc.length,
    sourceBinding: readFileSync(`${logs}/binding.jsonl`, 'utf8').trim().split('\n').map(x=>JSON.parse(x)).at(-1),
    control: name === 'omitted-hook' ? 'scratch fixture deliberately omits hook; no host connectivity changes' : null,
  }, null, 2)+'\n')
  const args = ['bun', `${root}/tests/native-features/scripts/one-native-conformance.ts`, '--simulator-id', simulator, '--bundle-id', 'com.natew.oneexample', '--suite', 'network', '--artifact-dir', dir]
  writeFileSync(`${dir}/command.json`, JSON.stringify(args, null, 2)+'\n')
  const log = Bun.file(`${dir}/runner.log`)
  const child = Bun.spawn(args, { cwd: root, stdout: log, stderr: log })
  const exitCode = await child.exited
  writeFileSync(`${dir}/outcome.json`, JSON.stringify({label: 'RAN', exitCode, expected: name === 'omitted-hook' ? 'rejection at hook agreement' : 'acceptance'}, null, 2)+'\n')
  console.log(`${name}: exit ${exitCode}`)
  if (name === 'omitted-hook') {
    const output = readFileSync(`${dir}/runner.log`, 'utf8')
    if (exitCode === 0 || !output.includes('the hook publishes the same live state as the native read') || !output.includes('PASS the listener fires at least once')) throw new Error('Control rejected for unrelated reason')
  } else if (exitCode !== 0) throw new Error(`Canonical ${name} rejected`)
 }
} finally { writeFileSync(fixture, canonical) }
