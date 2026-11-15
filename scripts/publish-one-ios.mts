import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Manifest } from '../packages/one/ios/prebuilt.ts'

const directory = resolve(process.argv[2]!)
const debug = JSON.parse(readFileSync(join(directory, 'Debug.json'), 'utf8'))
const release = JSON.parse(readFileSync(join(directory, 'Release.json'), 'utf8'))
assert.equal(debug.key, release.key, 'Debug and Release producer identity differs')
assert.deepEqual(
  debug.identity,
  release.identity,
  'Debug and Release compatibility differs'
)
const manifest: Manifest = {
  identity: debug.identity,
  key: debug.key,
  archives: {
    Debug: { file: debug.file, sha256: debug.sha256 },
    Release: { file: release.file, sha256: release.sha256 },
  },
}
const file = join(directory, 'manifest.json')
writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
if (!process.argv.includes('--publish')) process.exit(0)
const tag = `one-ios-${manifest.key}`
// a native identity is immutable; rebuilding it never replaces existing assets.
const existing = await fetch(
  `https://api.github.com/repos/onejs/one/releases/tags/${tag}`,
  {
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN!}` },
    signal: AbortSignal.timeout(120_000),
  }
)
assert(
  existing.ok || existing.status === 404,
  `GitHub release lookup failed: HTTP ${existing.status}`
)
if (existing.status === 404) {
  execFileSync(
    'gh',
    [
      'release',
      'create',
      tag,
      '--repo',
      'onejs/one',
      '--target',
      process.env.GITHUB_SHA!,
      '--prerelease',
      '--draft',
      '--latest=false',
      '--title',
      `One iOS binaries ${manifest.key.slice(0, 12)}`,
      '--notes',
      'Precompiled One iOS libraries. Automatically selected only for matching native inputs, peers, Xcode, and release groups. This does not publish an npm or stable release.',
      file,
      join(directory, debug.file),
      join(directory, release.file),
    ],
    { stdio: 'inherit' }
  )
} else if ((await existing.json()).draft) {
  execFileSync(
    'gh',
    [
      'release',
      'upload',
      tag,
      '--repo',
      'onejs/one',
      '--clobber',
      file,
      join(directory, debug.file),
      join(directory, release.file),
    ],
    { stdio: 'inherit' }
  )
} else {
  const published = await fetch(
    `https://github.com/onejs/one/releases/download/${tag}/manifest.json`,
    { signal: AbortSignal.timeout(120_000) }
  )
  assert(
    published.ok,
    `published One iOS manifest lookup failed: HTTP ${published.status}`
  )
  assert.deepEqual(
    await published.json(),
    manifest,
    'published native bytes differ; advance the native artifact format before publishing new bytes'
  )
  process.exit(0)
}
execFileSync(
  'gh',
  [
    'release',
    'edit',
    tag,
    '--repo',
    'onejs/one',
    '--draft=false',
    '--prerelease',
    '--latest=false',
  ],
  { stdio: 'inherit' }
)
