import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { rolldown } from 'rolldown'
import { resolveConfig, type Plugin } from 'vite'
import { describe, expect, test } from 'vitest'
import type * as NativeDevEngine from '../../../vxrn/types/utils/createNativeDevEngine'
import type { NativeAppManifest } from '../native/appManifest'
import { one } from './one'

// one() resolves the route tree from the process root, so run it from a
// fixture app. each test file gets its own worker, and cwd is restored.
async function defineFor(app: NativeAppManifest) {
  const cwd = process.cwd()
  process.chdir(
    fileURLToPath(new URL('../../../../tests/native-features', import.meta.url))
  )
  try {
    const plugins = (await one({ native: { app } })) as Array<any>
    const definePlugin = plugins
      .flat(Infinity)
      .find((plugin) => plugin?.name === 'one-define-environment')
    expect(definePlugin).toBeDefined()
    return (await definePlugin.config()).define as Record<string, string>
  } finally {
    process.chdir(cwd)
  }
}

describe('one-define-environment app info', () => {
  test('injects ONE_APP_VERSION from the manifest', async () => {
    const define = await defineFor({
      name: 'ProbeApp',
      version: '9.9.9',
      ios: { bundleId: 'dev.probe.ios', buildNumber: '4242' },
      android: { applicationId: 'dev.probe.android', versionCode: 4243 },
    })
    expect(define['process.env.ONE_APP_VERSION']).toBe('"9.9.9"')
    expect(define['import.meta.env.ONE_APP_VERSION']).toBe('"9.9.9"')
    // build and application id have no honest web value: never injected,
    // so the web entry reads null instead of a cross-platform guess.
    expect(define['process.env.ONE_APP_BUILD']).toBeUndefined()
    expect(define['import.meta.env.ONE_APP_BUILD']).toBeUndefined()
    expect(define['process.env.ONE_APP_APPLICATION_ID']).toBeUndefined()
    expect(define['import.meta.env.ONE_APP_APPLICATION_ID']).toBeUndefined()
  })

  test('defines nothing without a version', async () => {
    const define = await defineFor({
      name: 'ProbeApp',
      ios: { bundleId: 'dev.probe.ios', buildNumber: '4242' },
      android: { applicationId: 'dev.probe.android', versionCode: 4243 },
    })
    expect(define['process.env.ONE_APP_VERSION']).toBeUndefined()
    expect(define['import.meta.env.ONE_APP_VERSION']).toBeUndefined()
    expect(define['process.env.ONE_APP_BUILD']).toBeUndefined()
    expect(define['process.env.ONE_APP_APPLICATION_ID']).toBeUndefined()
  })
})

test('native.app leaves a hoisted optional Expo package outside the native bundle', async () => {
  const root = await mkdtemp(join(tmpdir(), 'one-native-expo-external-'))
  const fixture = fileURLToPath(
    new URL('../../../../tests/native-features', import.meta.url)
  )
  const originalCwd = process.cwd()
  const originalPlugins = globalThis.__vxrnAddNativePlugins
  try {
    const expoRoot = join(root, 'node_modules/expo-clipboard')
    await mkdir(expoRoot, { recursive: true })
    await writeFile(
      join(expoRoot, 'package.json'),
      '{"name":"expo-clipboard","main":"index.js"}'
    )
    await writeFile(
      join(expoRoot, 'index.js'),
      'globalThis.expoClipboardWasBundled = true'
    )
    await writeFile(
      join(root, 'entry.js'),
      `try { require('expo-clipboard') } catch { globalThis.optionalExpoMissing = true }`
    )

    process.chdir(fixture)
    await one({ native: { app: { name: 'ProbeApp' } } })
    process.chdir(originalCwd)

    const bundle = await rolldown({
      input: join(root, 'entry.js'),
      cwd: root,
      platform: 'neutral',
      plugins: globalThis.__vxrnAddNativePlugins?.('ios'),
    })
    const result = await bundle.generate({ format: 'cjs' })
    const code = result.output[0].code
    expect(code).not.toContain('expoClipboardWasBundled')
    const runtime = { optionalExpoMissing: false }
    runInNewContext(code, runtime)
    expect(runtime.optionalExpoMissing).toBe(true)

    process.chdir(fixture)
    await one({ native: {} })
    process.chdir(originalCwd)
    const legacyBundle = await rolldown({
      input: join(root, 'entry.js'),
      cwd: root,
      platform: 'neutral',
      plugins: globalThis.__vxrnAddNativePlugins?.('ios'),
    })
    const legacyResult = await legacyBundle.generate({ format: 'cjs' })
    expect(legacyResult.output[0].code).toContain('expoClipboardWasBundled')
  } finally {
    process.chdir(originalCwd)
    globalThis.__vxrnAddNativePlugins = originalPlugins
    await rm(root, { recursive: true, force: true })
  }
})

test.each(['serve', 'build'] as const)(
  'vite config plugins with a native form reach the native bundler (%s)',
  async (command) => {
    const fixture = fileURLToPath(
      new URL('../../../../tests/native-features', import.meta.url)
    )
    const originalCwd = process.cwd()
    const originalPlugins = globalThis.__vxrnAddNativePlugins
    const nativeForm = (name: string): Plugin => ({
      name,
      api: { vxrnNative: () => ({ name: `${name}-native` }) },
    })
    const compiler = nativeForm('compiler')
    // also listed for native by the app, which wins over the vite config
    const shadowed = nativeForm('listed')
    const listed: Plugin = { name: 'listed' }
    const webOnly: Plugin = { name: 'web-only' }
    try {
      process.chdir(fixture)
      await resolveConfig(
        {
          configFile: false,
          plugins: [
            one({ native: { bundlerOptions: { plugins: [listed] } } }),
            // nested, the way a plugin package returns its plugins
            [webOnly, compiler, shadowed],
          ],
        },
        command
      )
      const nativePlugins = globalThis.__vxrnAddNativePlugins?.('ios')
      expect(nativePlugins).toContain(compiler)
      expect(nativePlugins).toContain(listed)
      expect(nativePlugins).not.toContain(shadowed)
      expect(nativePlugins).not.toContain(webOnly)
    } finally {
      process.chdir(originalCwd)
      globalThis.__vxrnAddNativePlugins = originalPlugins
    }
  }
)

test('macos rejects a package with only mobile and web implementations at bundle time', async () => {
  const root = await mkdtemp(join(tmpdir(), 'one-macos-platform-import-'))
  const fixture = fileURLToPath(
    new URL('../../../../tests/native-features', import.meta.url)
  )
  const originalCwd = process.cwd()
  const originalPlugins = globalThis.__vxrnAddNativePlugins
  let native:
    | Awaited<ReturnType<typeof NativeDevEngine.createNativeDevEngine>>
    | undefined
  try {
    const pkg = join(root, 'node_modules/expo-ghostty')
    await mkdir(pkg, { recursive: true })
    await symlink(
      fileURLToPath(new URL('../../', import.meta.url)),
      join(root, 'node_modules/one')
    )
    await writeFile(
      join(pkg, 'package.json'),
      JSON.stringify({ name: 'expo-ghostty', main: 'index.js' })
    )
    await writeFile(join(pkg, 'index.js'), "export { default } from './GhosttyView'")
    for (const platform of ['ios', 'android', 'web']) {
      await writeFile(
        join(pkg, `GhosttyView.${platform}.js`),
        `export default '${platform}'`
      )
    }
    process.chdir(fixture)
    await one({ native: { app: { name: 'ProbeApp' } } })
    process.chdir(originalCwd)
    const { createNativeDevEngine }: typeof NativeDevEngine =
      await import('../../../vxrn/dist/utils/createNativeDevEngine.mjs')
    native = await createNativeDevEngine({
      root,
      platform: 'macos',
      port: 0,
      plugins: [
        {
          name: 'macos-platform-import-fixture',
          transform(_code, id) {
            if (id.endsWith('/__virtual-native-entry.tsx')) {
              return "import GhosttyView from 'expo-ghostty'; globalThis.ghostty = GhosttyView"
            }
          },
        },
      ],
    })
    await expect(native.getBundle()).rejects.toThrow(
      /expo-ghostty\/GhosttyView has no macOS implementation: cannot resolve import "\.\/GhosttyView"/
    )
  } finally {
    await native?.close()
    process.chdir(originalCwd)
    globalThis.__vxrnAddNativePlugins = originalPlugins
    await rm(root, { recursive: true, force: true })
  }
})
