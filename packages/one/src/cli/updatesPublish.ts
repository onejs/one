import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { validateNativeApp } from '../native/appManifest'
import { loadUserOneOptions } from '../vite/loadConfig'

type PublishArgs = {
  platform?: string | string[]
  out?: string | string[]
  metadata?: string | string[]
}

function lastValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[value.length - 1] : value
}

function allValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function base64Url(bytes: Buffer): string {
  return bytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function sha256Base64Url(path: string): string {
  return base64Url(createHash('sha256').update(readFileSync(path)).digest())
}

// --metadata key=value pairs. values parse as json scalars when they look
// like one, so attempt=3 stages a number; anything else stays a string.
function parseMetadata(entries: string[]): Record<string, string | number | boolean> {
  const metadata: Record<string, string | number | boolean> = {}
  for (const entry of entries) {
    const equals = entry.indexOf('=')
    if (equals <= 0) {
      throw new Error(`[one] --metadata must look like key=value, got "${entry}"`)
    }
    const key = entry.slice(0, equals)
    const raw = entry.slice(equals + 1)
    let value: string | number | boolean = raw
    try {
      const parsed: unknown = JSON.parse(raw)
      if (
        typeof parsed === 'string' ||
        typeof parsed === 'number' ||
        typeof parsed === 'boolean'
      ) {
        value = parsed
      }
    } catch {
      // not json: the raw string stands
    }
    metadata[key] = value
  }
  return metadata
}

function collectFiles(root: string): string[] {
  const files: string[] = []
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) visit(path)
      else if (entry.isFile()) files.push(path)
    }
  }
  if (existsSync(root)) visit(root)
  return files.sort()
}

function resolveCliJs(root: string): string {
  // cli.js is not in react-native's exports map since 0.87, so resolve the
  // exported package.json and step to the sibling cli.js on disk.
  const require = createRequire(join(root, 'package.json'))
  const packageJson = require.resolve('react-native/package.json')
  return join(packageJson.slice(0, -'package.json'.length), 'cli.js')
}

function resolveNpmHermesc(root: string): string {
  // through react-native's own dependency graph: it pins the compiler whose
  // bytecode its hermes vm runs.
  const require = createRequire(join(root, 'package.json'))
  const reactNativeJson = require.resolve('react-native/package.json')
  const nested = createRequire(reactNativeJson)
  const compilerJson = nested.resolve('hermes-compiler/package.json')
  const dir = compilerJson.slice(0, -'package.json'.length)
  const bin =
    process.platform === 'darwin'
      ? 'osx-bin'
      : process.platform === 'win32'
        ? 'win64-bin'
        : 'linux64-bin'
  return join(dir, 'hermesc', bin, process.platform === 'win32' ? 'hermesc.exe' : 'hermesc')
}

function resolveHermesc(root: string, platform: string): string {
  // the embedded ios build compiles with the hermes-engine pod's own
  // hermesc when it exists, because the pod's vm train can differ from the
  // npm compiler; otherwise both platforms use the npm compiler. publish
  // follows the same rule, so its bytecode always matches the binary's vm.
  if (platform === 'ios') {
    const pod = join(root, 'ios', 'Pods', 'hermes-engine', 'destroot', 'bin', 'hermesc')
    if (existsSync(pod)) return pod
  }
  const npm = resolveNpmHermesc(root)
  if (!existsSync(npm)) {
    throw new Error(
      `[one] hermesc not found at ${npm}: install dependencies${platform === 'ios' ? ' and run one prebuild with pod install' : ''} first`
    )
  }
  return npm
}

export async function runUpdatesPublish(args: PublishArgs): Promise<void> {
  const platform = lastValue(args.platform)
  if (platform !== 'ios' && platform !== 'android') {
    throw new Error('[one] one updates publish needs --platform ios|android')
  }
  const out = lastValue(args.out)
  if (!out) {
    throw new Error('[one] one updates publish needs --out <dir>')
  }
  const root = process.cwd()
  const { oneOptions } = await loadUserOneOptions('build', true)
  const native = oneOptions?.native
  const app = typeof native === 'object' ? native.app : undefined
  if (!app) {
    throw new Error(
      '[one] native.app is required: configure one({ native: { app } }) with name, ios.bundleId, and android.applicationId'
    )
  }
  validateNativeApp(app)
  const runtimeVersion = app.updates?.runtimeVersion
  if (!runtimeVersion) {
    throw new Error(
      '[one] one updates publish needs native.app.updates.runtimeVersion: the binary only takes updates published for its own runtime version'
    )
  }
  if (existsSync(out) && readdirSync(out).length > 0) {
    throw new Error(
      `[one] refusing to publish into non-empty ${out}: every publish writes a fresh directory`
    )
  }
  mkdirSync(out, { recursive: true })
  const assetsOut = join(out, 'assets')
  mkdirSync(assetsOut, { recursive: true })
  const metadata = parseMetadata(allValues(args.metadata))

  const work = mkdtempSync(join(tmpdir(), 'one-updates-publish-'))
  const bundleJs = join(work, 'bundle.js')
  const assetsDir = join(work, 'assets')
  const bytecode = join(work, 'main.jsbundle')
  try {
    // the same bundle command the embedded builders run, through the same
    // react-native config override, so the bundler and entry match the
    // embedded build by construction. minify matches each platform's
    // embedded default: the ios pod patch appends --minify true after the
    // script's --minify false and the last flag wins, while gradle passes
    // false.
    execFileSync(
      process.execPath,
      [
        resolveCliJs(root),
        'bundle',
        '--entry-file',
        'index.js',
        '--platform',
        platform,
        '--dev',
        'false',
        '--reset-cache',
        '--bundle-output',
        bundleJs,
        '--assets-dest',
        assetsDir,
        '--minify',
        platform === 'ios' ? 'true' : 'false',
      ],
      { cwd: root, stdio: 'inherit' }
    )
    // the same compiler and flags as the embedded builders: -O bytecode,
    // warnings off on android like the gradle task. no sourcemaps: they
    // change no shipped byte.
    const hermesc = resolveHermesc(root, platform)
    const hermescArgs = ['-emit-binary', '-max-diagnostic-width=80']
    if (platform === 'android') hermescArgs.push('-w')
    hermescArgs.push('-O', '-out', bytecode, bundleJs)
    try {
      execFileSync(hermesc, hermescArgs, { cwd: root, stdio: 'inherit' })
    } catch (error) {
      throw new Error(
        `[one] hermesc failed to compile the ${platform} update bundle${error instanceof Error ? `: ${error.message}` : ''}`
      )
    }

    // the assets tree the bundler laid out is already the update layout:
    // React Native resolves each asset at its relative path next to a
    // bundle loaded from a file url. every served file is content-named.
    const bundleHash = sha256Base64Url(bytecode)
    writeFileSync(join(assetsOut, bundleHash), readFileSync(bytecode))
    const assets: Array<{ hash: string; url: string; path: string }> = []
    for (const file of collectFiles(assetsDir)) {
      const hash = sha256Base64Url(file)
      const target = join(assetsOut, hash)
      if (!existsSync(target)) writeFileSync(target, readFileSync(file))
      assets.push({
        hash,
        url: `assets/${hash}`,
        path: relative(assetsDir, file).split(sep).join('/'),
      })
    }
    assets.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    const manifest = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      runtimeVersion,
      launchAsset: { hash: bundleHash, url: `assets/${bundleHash}`, path: 'main.jsbundle' },
      assets,
      metadata,
    }
    writeFileSync(join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    console.info(
      `[one] published ${platform} update ${manifest.id} (${assets.length} assets) to ${out}`
    )
  } finally {
    rmSync(work, { recursive: true, force: true })
  }
}
