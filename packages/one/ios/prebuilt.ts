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
import { fileURLToPath, pathToFileURL } from 'node:url'

export type Identity = {
  format: 1
  source: string
  dependencies: Record<string, string>
  xcode: string
  swift: string
  reactNativePrebuilt: { core: boolean; dependencies: boolean }
  releaseGroups: string[]
}
type Archive = { file: string; sha256: string }
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
    ['react-native-nitro-modules', ['ios', 'cpp', 'NitroModules.podspec']],
    ['react-native-worklets', ['apple', 'Common', 'RNWorklets.podspec']],
  ] satisfies Array<[string, string[]]>) {
    const manifest = require.resolve(`${name}/package.json`)
    dependencies[name] = digestTree(dirname(manifest), ['package.json', ...paths])
  }
  const catalog = Object.keys(
    JSON.parse(readFileSync(join(one, 'ios-link-set.json'), 'utf8')).groups
  ).sort()
  const linkSet = join(ios, 'one-link-set.json')
  const groups: unknown = existsSync(linkSet)
    ? JSON.parse(readFileSync(linkSet, 'utf8')).groups
    : catalog
  assert(
    Array.isArray(groups) &&
      groups.every((group) => typeof group === 'string' && catalog.includes(group)),
    'invalid One iOS release groups'
  )
  return {
    format: 1,
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
    swift: execFileSync('xcrun', ['swiftc', '--version'], { encoding: 'utf8' }).trim(),
    reactNativePrebuilt: {
      core: process.env.RCT_USE_PREBUILT_RNCORE !== '0',
      dependencies: process.env.RCT_USE_RN_DEP !== '0',
    },
    releaseGroups: [...new Set<string>(groups)].sort(),
  }
}

export function artifactKey(value: Identity): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

async function sha256(file: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  return hash.digest('hex')
}

function readManifest(value: unknown, expected: Identity): Manifest {
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
    const base = `${repository}/one-ios-${key}`
    const manifestResponse = local ? undefined : await response(`${base}/manifest.json`)
    if (manifestResponse?.status === 404 && mode === 'auto')
      return { reason: `no published binary for ${key.slice(0, 12)}` }
    assert(
      !manifestResponse || manifestResponse.ok,
      `One iOS binary manifest download failed: HTTP ${manifestResponse?.status}`
    )
    const manifest = readManifest(
      local
        ? JSON.parse(readFileSync(join(local, 'manifest.json'), 'utf8'))
        : await manifestResponse!.json(),
      expected
    )
    mkdirSync(dirname(cache), { recursive: true })
    const temporary = mkdtempSync(join(dirname(cache), '.download-'))
    try {
      for (const configuration of configurations) {
        const entry = manifest.archives[configuration]
        const archive = join(temporary, entry.file)
        if (local) {
          await pipeline(
            createReadStream(join(local, entry.file)),
            createWriteStream(archive)
          )
        } else {
          const download = await response(`${base}/${entry.file}`)
          assert(
            download.ok && download.body,
            `One iOS ${configuration} download failed: HTTP ${download.status}`
          )
          await pipeline(Readable.fromWeb(download.body), createWriteStream(archive))
        }
        assert.equal(
          await sha256(archive),
          entry.sha256,
          `One iOS ${configuration} archive checksum mismatch`
        )
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
      if (!existsSync(cache)) renameSync(temporary, cache)
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
  if (lstatSync(link, { throwIfNoEntry: false })) {
    assert(
      lstatSync(link).isSymbolicLink() && realpathSync(link) === cache,
      `${link} must link to its matching One binary cache`
    )
  } else symlinkSync(cache, link, 'dir')
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

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const [command, argument] = process.argv.slice(2)
  assert(argument, 'expected an iOS project or binary destination')
  if (command === 'resolve') console.log(JSON.stringify(await install(resolve(argument))))
  else if (command === 'import') {
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
