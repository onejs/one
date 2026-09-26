// the updates suite's static update server and publisher, shared by the ios
// and android runners. every publish bundles the current sources with the
// same command the embedded builders run, into a fresh dir; the manifest
// overwrites the served one and the content-named assets accumulate like a
// cdn.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const updatesServerPort = 8471

export type ServedManifest = {
  id: string
  createdAt: string
  runtimeVersion: string
  launchAsset: { hash: string; url: string; path: string }
  assets: { hash: string; url: string; path: string }[]
}

export function startUpdatesServer(artifactDir: string, platform: 'ios' | 'android') {
  const servePrefix = `/${platform}/updates-suite/`
  const serverRoot = path.join(artifactDir, 'updates-server')
  fs.rmSync(serverRoot, { recursive: true, force: true })
  const serveDir = path.join(serverRoot, platform, 'updates-suite')
  fs.mkdirSync(path.join(serveDir, 'assets'), { recursive: true })
  const server = Bun.serve({
    port: updatesServerPort,
    fetch(request) {
      const pathname = new URL(request.url).pathname
      if (!pathname.startsWith(servePrefix)) return new Response('not found', { status: 404 })
      const file = path.join(serverRoot, pathname)
      if (!file.startsWith(serverRoot)) return new Response('not found', { status: 404 })
      try {
        if (!fs.statSync(file).isFile()) return new Response('not found', { status: 404 })
      } catch {
        return new Response('not found', { status: 404 })
      }
      return new Response(Bun.file(file))
    },
  })

  const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const oneCli = path.resolve(appRoot, '../../packages/one/run.mjs')
  const bootFile = path.join(appRoot, 'fixtures', 'updates-boot.ts')
  const fixtureFile = path.join(appRoot, 'fixtures', 'one-native-updates.tsx')
  const variantsDir = path.join(appRoot, 'fixtures', 'updates-variants')
  const baseBoot = fs.readFileSync(bootFile, 'utf8')
  const baseFixture = fs.readFileSync(fixtureFile, 'utf8')
  const restoreSources = () => {
    fs.writeFileSync(bootFile, baseBoot)
    fs.writeFileSync(fixtureFile, baseFixture)
  }
  const manifestPath = path.join(serveDir, 'manifest.json')

  const readServedManifest = (): ServedManifest => {
    const raw: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    const field = (value: unknown, key: string): unknown =>
      typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
    const asset = (value: unknown) => {
      const hash = field(value, 'hash')
      const url = field(value, 'url')
      const assetPath = field(value, 'path')
      if (typeof hash !== 'string' || typeof url !== 'string' || typeof assetPath !== 'string')
        throw new Error('served manifest has a malformed asset')
      return { hash, url, path: assetPath }
    }
    const id = field(raw, 'id')
    const createdAt = field(raw, 'createdAt')
    const runtimeVersion = field(raw, 'runtimeVersion')
    const launchAsset = field(raw, 'launchAsset')
    const assets = field(raw, 'assets')
    if (
      typeof id !== 'string' ||
      typeof createdAt !== 'string' ||
      typeof runtimeVersion !== 'string' ||
      !Array.isArray(assets)
    )
      throw new Error('served manifest has an unexpected shape')
    return { id, createdAt, runtimeVersion, launchAsset: asset(launchAsset), assets: assets.map(asset) }
  }

  let publishCount = 0
  const publish = (variant: string, metadata: string[] = []): ServedManifest => {
    fs.writeFileSync(bootFile, fs.readFileSync(path.join(variantsDir, `boot.${variant}.ts`), 'utf8'))
    const fixtureVariant = path.join(variantsDir, `fixture.${variant}.tsx`)
    if (fs.existsSync(fixtureVariant))
      fs.writeFileSync(fixtureFile, fs.readFileSync(fixtureVariant, 'utf8'))
    try {
      const out = path.join(artifactDir, `updates-publish-${publishCount}-${variant}`)
      publishCount += 1
      fs.rmSync(out, { recursive: true, force: true })
      // the release build under test bundles with rolldown, so publish pins
      // the same bundler rather than inheriting the caller's.
      const env = { ...process.env, ONE_NATIVE_BUNDLER: 'rolldown' }
      execFileSync(
        'node',
        [
          oneCli,
          'updates',
          'publish',
          '--platform',
          platform,
          '--out',
          out,
          ...metadata.flatMap((entry) => ['--metadata', entry]),
        ],
        { cwd: appRoot, env, stdio: 'inherit', timeout: 600_000 }
      )
      fs.writeFileSync(manifestPath, fs.readFileSync(path.join(out, 'manifest.json')))
      for (const file of fs.readdirSync(path.join(out, 'assets'))) {
        fs.writeFileSync(
          path.join(serveDir, 'assets', file),
          fs.readFileSync(path.join(out, 'assets', file))
        )
      }
      return readServedManifest()
    } finally {
      restoreSources()
    }
  }

  // the served json is edited in place so every field the publisher wrote
  // survives and only the runtime version makes the manifest foreign.
  const serveForeignRuntime = () =>
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          ...JSON.parse(fs.readFileSync(manifestPath, 'utf8')),
          id: `foreign-${Date.now()}`,
          createdAt: new Date().toISOString(),
          runtimeVersion: 'other-runtime',
        },
        null,
        2
      )
    )

  // a manifest whose id and asset path climb out of the updates directory:
  // the launcher refuses it as unusable before any file is written.
  const serveEscapingPaths = () => {
    const served = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          ...served,
          id: '..',
          createdAt: new Date().toISOString(),
          assets: [...served.assets, { ...served.launchAsset, path: '../../escaped' }],
        },
        null,
        2
      )
    )
  }

  // the tamper lands on the launch asset: every publish emits fresh bundle
  // bytes, so the client always downloads it, while a republished image
  // would hard-link from disk and never touch the tampered bytes.
  const tamperLaunchAsset = () => {
    const bundleFile = path.join(serveDir, 'assets', readServedManifest().launchAsset.hash)
    const bundleBytes = fs.readFileSync(bundleFile)
    bundleBytes[Math.floor(bundleBytes.length / 2)] ^= 0xff
    fs.writeFileSync(bundleFile, bundleBytes)
  }

  const stop = () => {
    restoreSources()
    server.stop()
  }

  return { publish, serveForeignRuntime, serveEscapingPaths, tamperLaunchAsset, stop }
}

// the launcher's state file, parsed strictly: the suite asserts on it.
export function parseUpdatesState(json: string): {
  launching: string | null
  updates: Record<string, { successes: number; failed: boolean }>
} {
  const raw: unknown = JSON.parse(json)
  const field = (value: unknown, key: string): unknown =>
    typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined
  const launching = field(raw, 'launching')
  const updates = field(raw, 'updates')
  if (launching !== null && launching !== undefined && typeof launching !== 'string')
    throw new Error('state.json has an unexpected shape')
  if (typeof updates !== 'object' || updates === null)
    throw new Error('state.json has an unexpected shape')
  const entries: Record<string, { successes: number; failed: boolean }> = {}
  for (const [id, entry] of Object.entries(updates)) {
    const successes = field(entry, 'successes')
    const failed = field(entry, 'failed')
    if (typeof successes !== 'number' || typeof failed !== 'boolean')
      throw new Error('state.json has an unexpected shape')
    entries[id] = { successes, failed }
  }
  return { launching: typeof launching === 'string' ? launching : null, updates: entries }
}

// the update directories on disk; a leftover temp entry is a failure.
export function updateIdsIn(entries: string[]) {
  const temps = entries.filter((name) => name.startsWith('.tmp-') || name.endsWith('.tmp'))
  if (temps.length > 0) throw new Error(`stale temp entries on disk: ${temps.join(', ')}`)
  return entries.filter((name) => name !== 'state.json').sort()
}
