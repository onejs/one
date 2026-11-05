// shared identity and installer for the public ios native artifacts. runs in node
// during pod install, without loading the framework's javascript build outputs.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import {
  constants,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

export type Identity = {
  // bump when the framework packaging contract changes, including script-only fixes.
  format: 2
  source: string
  dependencies: Record<string, string>
  xcode: string
  swift: string
  workletsFlags: Array<[string, string]>
  releaseGroups: string[]
}
export type Archive = { file: string; sha256: string }
export type Manifest = {
  identity: Identity
  key: string
  archives: Record<'Debug' | 'Release', Archive>
}

const one = dirname(dirname(fileURLToPath(import.meta.url)))
const repository = 'https://github.com/onejs/one/releases/download'
const configurations = ['Debug', 'Release'] as const

function digestTree(root: string, paths: string[]): string {
  const hash = createHash('sha256')
  const walk = (name: string) => {
    if (!existsSync(join(root, name))) return
    const stat = lstatSync(join(root, name))
    if (stat.isDirectory()) {
      for (const child of readdirSync(join(root, name)).sort()) {
        if (
          ['Prebuilt', 'build', '.build', 'Tests', '__tests__', '.DS_Store'].includes(
            child
          )
        )
          continue
        walk(join(name, child))
      }
    } else if (stat.isFile()) {
      hash
        .update(name)
        .update('\0')
        .update(readFileSync(join(root, name)))
        .update('\0')
    }
  }
  paths.sort().forEach(walk)
  return hash.digest('hex')
}

export function identity(ios: string): Identity {
  const require = createRequire(join(resolve(ios, '..'), 'package.json'))
  const dependencies: Record<string, string> = {}
  for (const [name, paths] of [
    [
      'react-native',
      [
        'React',
        'ReactCommon',
        'Libraries',
        'src',
        'scripts',
        'React-Core-prebuilt.podspec',
      ],
    ],
    [
      'react-native-nitro-modules',
      ['ios', 'cpp', 'NitroModules.podspec', 'nitro_pod_utils.rb'],
    ],
    [
      'react-native-worklets',
      [
        'apple',
        'Common',
        'RNWorklets.podspec',
        'scripts',
        'src/featureFlags/staticFlags.json',
      ],
    ],
  ] satisfies Array<[string, string[]]>) {
    const manifest = require.resolve(`${name}/package.json`)
    dependencies[name] = digestTree(dirname(manifest), ['package.json', ...paths])
  }
  const catalog = Object.keys(
    JSON.parse(readFileSync(join(one, 'ios-link-set.json'), 'utf8')).groups
  ).sort()
  const app = JSON.parse(readFileSync(join(ios, '../package.json'), 'utf8'))
  const workletsFlags = Object.entries(app.worklets?.staticFeatureFlags ?? {})
    .map(([name, value]): [string, string] => {
      assert(
        ['boolean', 'string', 'number'].includes(typeof value),
        `invalid Worklets flag: ${name}`
      )
      return [name, String(value)]
    })
    .sort(([a], [b]) => a.localeCompare(b))
  return {
    format: 2,
    source: digestTree(one, [
      'ios',
      'cpp',
      'nitrogen/generated',
      'schema.json',
      'ios-link-set.json',
      'One.podspec',
    ]),
    dependencies,
    xcode: execFileSync('xcodebuild', ['-version'], { encoding: 'utf8' }).trim(),
    swift: execFileSync('xcrun', ['swiftc', '--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .trim()
      .split('\n')[0]!,
    workletsFlags,
    releaseGroups: catalog,
  }
}

export function artifactKey(value: Identity): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export async function sha256(file: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

export function readManifest(value: unknown, expected: Identity): Manifest {
  assert(
    value &&
      typeof value === 'object' &&
      'identity' in value &&
      'key' in value &&
      'archives' in value,
    'invalid One iOS binary manifest'
  )
  assert.deepEqual(value.identity, expected, 'One iOS binary compatibility mismatch')
  assert.equal(value.key, artifactKey(expected), 'One iOS binary identity mismatch')
  const archives = value.archives
  assert(archives && typeof archives === 'object', 'missing One iOS binary archives')
  const readArchive = (name: 'Debug' | 'Release'): Archive => {
    assert(name in archives, `missing ${name} One iOS binary`)
    const entry: unknown = Reflect.get(archives, name)
    assert(
      entry && typeof entry === 'object' && 'file' in entry && 'sha256' in entry,
      'invalid One iOS binary archive'
    )
    assert.equal(entry.file, `one-ios-${value.key}-${name}.tar.gz`)
    assert(
      typeof entry.file === 'string' &&
        typeof entry.sha256 === 'string' &&
        /^[a-f0-9]{64}$/.test(entry.sha256),
      'invalid One iOS archive digest'
    )
    return { file: entry.file, sha256: entry.sha256 }
  }
  return {
    identity: expected,
    key: artifactKey(expected),
    archives: { Debug: readArchive('Debug'), Release: readArchive('Release') },
  }
}

async function response(url: string): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(120_000) })
}

export async function publishedManifest(
  expected: Identity
): Promise<Manifest | undefined> {
  const result = await response(
    `${repository}/one-ios-${artifactKey(expected)}/manifest.json`
  )
  if (result.status === 404) return undefined
  assert(result.ok, `One iOS binary manifest download failed: HTTP ${result.status}`)
  return readManifest(await result.json(), expected)
}

export async function downloadArchive(
  key: string,
  entry: Archive,
  destination: string
): Promise<void> {
  const download = await response(`${repository}/one-ios-${key}/${entry.file}`)
  assert(
    download.ok && download.body,
    `One iOS archive download failed: HTTP ${download.status}`
  )
  await pipeline(Readable.from(download.body), createWriteStream(destination))
  assert.equal(
    await sha256(destination),
    entry.sha256,
    'One iOS archive checksum mismatch'
  )
}

export async function install(
  ios: string,
  local?: string
): Promise<{ path?: string; reason?: string }> {
  const mode = process.env.ONE_PREBUILT_IOS ?? 'auto'
  assert(
    ['auto', '0', '1'].includes(mode),
    'ONE_PREBUILT_IOS must be auto, 0 (source), or 1 (require binaries)'
  )
  if (mode === '0') return { reason: 'source build requested' }
  if (
    process.env.RCT_TESTONLY_RNCORE_TARBALL_PATH ||
    process.env.RCT_TESTONLY_RNCORE_VERSION ||
    process.env.RCT_USE_LOCAL_RN_DEP ||
    process.env.RCT_DEPS_VERSION
  ) {
    assert(mode !== '1', 'One binaries require the standard React Native artifacts')
    return { reason: 'custom React Native artifacts require a source build' }
  }
  if (process.arch !== 'arm64') {
    assert(mode !== '1', 'One iOS binaries currently require an arm64 Mac')
    return { reason: 'source build on an Intel Mac' }
  }
  const expected = identity(ios)
  const key = artifactKey(expected)
  const cache = join(homedir(), 'Library/Caches/One/ios', key)
  const cachedManifest = join(cache, 'manifest.json')
  if (existsSync(cachedManifest)) {
    readManifest(JSON.parse(readFileSync(cachedManifest, 'utf8')), expected)
  } else {
    const manifest = local
      ? readManifest(
          JSON.parse(readFileSync(join(local, 'manifest.json'), 'utf8')),
          expected
        )
      : await publishedManifest(expected)
    if (!manifest) {
      assert(mode !== '1', `no published One iOS binary for ${key}`)
      return { reason: `no published binary for ${key.slice(0, 12)}` }
    }
    mkdirSync(dirname(cache), { recursive: true })
    const temporary = mkdtempSync(join(dirname(cache), '.download-'))
    try {
      for (const configuration of configurations) {
        const entry: Archive = manifest.archives[configuration]
        const archive = join(temporary, entry.file)
        if (local) {
          await pipeline(
            createReadStream(join(local, entry.file)),
            createWriteStream(archive)
          )
          assert.equal(
            await sha256(archive),
            entry.sha256,
            'One iOS archive checksum mismatch'
          )
        } else {
          await downloadArchive(key, entry, archive)
        }
        // accept only a framework tree, never absolute paths, traversal or links.
        const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' })
          .trim()
          .split('\n')
        assert(
          entries.every(
            (name) =>
              name.startsWith('One.xcframework/') && !name.split('/').includes('..')
          ),
          'invalid One iOS archive paths'
        )
        const types = execFileSync('tar', ['-tvzf', archive], { encoding: 'utf8' })
          .trim()
          .split('\n')
        assert(
          types.every((line) => /^[-d]/.test(line)),
          'One iOS archives cannot contain links or special files'
        )
        const destination = join(temporary, configuration)
        mkdirSync(destination)
        execFileSync('tar', ['-xzf', archive, '-C', destination])
        rmSync(archive)
        for (const slice of ['ios-arm64', 'ios-arm64-simulator']) {
          assert(
            existsSync(join(destination, 'One.xcframework', slice, 'One.framework/One')),
            `missing One iOS ${slice} binary`
          )
        }
      }
      writeFileSync(
        join(temporary, 'manifest.json'),
        `${JSON.stringify(manifest, null, 2)}\n`
      )
      try {
        renameSync(temporary, cache)
      } catch (error) {
        if (
          !(
            error instanceof Error &&
            'code' in error &&
            (error.code === 'EEXIST' || error.code === 'ENOTEMPTY')
          )
        )
          throw error
      }
    } finally {
      rmSync(temporary, { recursive: true, force: true })
    }
  }
  for (const configuration of configurations) {
    for (const slice of ['ios-arm64', 'ios-arm64-simulator']) {
      assert(
        existsSync(
          join(cache, configuration, 'One.xcframework', slice, 'One.framework/One')
        ),
        `incomplete One binary cache: ${configuration}/${slice}`
      )
    }
  }
  const relative = join('ios/Prebuilt', key)
  const link = join(one, relative)
  mkdirSync(dirname(link), { recursive: true })
  try {
    symlinkSync(cache, link, 'dir')
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST'))
      throw error
  }
  assert(
    lstatSync(link).isSymbolicLink() && realpathSync(link) === cache,
    `${link} must link to its matching One binary cache`
  )
  return { path: relative }
}

// CocoaPods first copies its declared Debug xcframework. this phase then picks
// the matching configuration before dependents compile or link against One.
export function select(root: string, destination: string): void {
  const configuration = process.env.CONFIGURATION === 'Debug' ? 'Debug' : 'Release'
  const platform = process.env.PLATFORM_NAME
  assert(
    platform === 'iphoneos' || platform === 'iphonesimulator',
    `unsupported One binary platform: ${platform}`
  )
  assert(
    process.env.ARCHS?.trim() === 'arm64',
    'One iOS binaries require ARCHS=arm64; run ONE_PREBUILT_IOS=0 pod install for other architectures'
  )
  const slice = platform === 'iphoneos' ? 'ios-arm64' : 'ios-arm64-simulator'
  const source = join(root, configuration, 'One.xcframework', slice, 'One.framework')
  mkdirSync(destination, { recursive: true })
  rmSync(join(destination, 'One.framework'), { recursive: true, force: true })
  cpSync(source, join(destination, 'One.framework'), {
    recursive: true,
    mode: constants.COPYFILE_FICLONE,
  })
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, argument] = process.argv.slice(2)
  assert(argument, 'expected an iOS project or binary destination')
  if (command === 'resolve') {
    assert(
      process.argv[4] === 'prebuilt' || process.argv[4] === 'source',
      'expected the resolved React Native build mode from CocoaPods'
    )
    if (process.argv[4] === 'source') {
      assert(
        process.env.ONE_PREBUILT_IOS !== '1',
        'One binaries require precompiled React Native core and dependencies'
      )
      console.log(JSON.stringify({ reason: 'React Native is building from source' }))
    } else console.log(JSON.stringify(await install(resolve(argument))))
  } else if (command === 'import') {
    assert(process.argv[4], 'expected an artifact directory')
    console.log(
      JSON.stringify(await install(resolve(argument), resolve(process.argv[4])))
    )
  } else if (command === 'identity')
    console.log(JSON.stringify(identity(resolve(argument)), null, 2))
  else if (command === 'select') {
    assert(process.argv[4], 'expected a One binary destination')
    select(resolve(argument), resolve(process.argv[4]))
  } else throw new Error(`unknown One iOS binary command: ${command}`)
}
