import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'

const { nativeBuild } = vi.hoisted(() => ({ nativeBuild: vi.fn() }))

vi.mock('../config/getOptionsFilled', () => ({
  fillOptions: async (options: object) => ({ ...options, root: process.cwd() }),
}))
vi.mock('../utils/patches', () => ({ applyBuiltInPatches: async () => {} }))
vi.mock('../config/getOptimizeDeps', () => ({
  getOptimizeDeps: () => ({
    optimizeDeps: { include: [], exclude: [], needsInterop: [] },
  }),
}))
vi.mock('vite', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vite')>()),
  loadConfigFromFile: async () => ({
    config: { build: { outDir: 'output', emptyOutDir: false } },
  }),
}))
vi.mock('../config/getBaseViteConfigWithPlugins', () => ({
  getBaseViteConfigWithPlugins: async () => ({
    root: process.cwd(),
    plugins: [
      {
        name: 'build-lifecycle-fixture',
        resolveId: (id: string) =>
          id === 'virtual:one-entry' ? '\0virtual:one-entry' : undefined,
        load: (id: string) =>
          id === '\0virtual:one-entry'
            ? 'export const render = () => "rendered"; globalThis.rendered = render()'
            : undefined,
      },
    ],
    build: { rolldownOptions: { output: { entryFileNames: '_virtual_one-entry.js' } } },
  }),
}))
vi.mock('../rn-commands/bundle/buildBundle', () => ({ buildBundle: nativeBuild }))

import { build } from './build'

const originalCwd = process.cwd()
const originalEnv = { ...process.env }
const originalPlugins = globalThis.__vxrnAddWebPluginsProd
let root: string | undefined

afterEach(async () => {
  process.chdir(originalCwd)
  process.env = { ...originalEnv }
  globalThis.__vxrnAddWebPluginsProd = originalPlugins
  if (root) await rm(root, { recursive: true, force: true })
})

it('reuses client output for generation while cleaning rebuilt output', async () => {
  root = await mkdtemp(join(tmpdir(), 'vxrn-build-lifecycle-'))
  process.chdir(root)
  process.env.NODE_ENV = 'production'
  process.env.ONE_SERVER_URL = 'https://example.com'
  globalThis.__vxrnAddWebPluginsProd = []
  const options = { skipEnv: true }

  const full = await build(options, { platform: 'web' })
  expect(full?.clientOutput?.length).toBeGreaterThan(0)
  expect(full?.serverOutput?.length).toBeGreaterThan(0)
  const manifestPath = 'output/client/.vite/manifest.json'
  const manifest = await readFile(manifestPath, 'utf8')
  const clientFile = Object.values(JSON.parse(manifest))[0] as { file: string }
  const assetPath = join('output/client', clientFile.file)
  const asset = await readFile(assetPath)
  const serverEntry = await readFile(full!.serverEntry, 'utf8')
  await writeFile(full!.serverEntry, 'old server entry')
  await writeFile('output/server/stale.js', 'old server chunk')
  await writeFile('output/client/keep.txt', 'retained client output')

  const generated = await build(options, { platform: 'web', step: 'generate' })
  expect(generated?.clientOutput).toBeUndefined()
  expect(generated?.serverOutput?.length).toBeGreaterThan(0)
  expect(generated?.clientManifest).toEqual(JSON.parse(manifest))
  expect(await readFile(generated!.serverEntry, 'utf8')).toBe(serverEntry)
  expect(await readFile(manifestPath, 'utf8')).toBe(manifest)
  expect(await readFile(assetPath)).toEqual(asset)
  expect(await readFile('output/client/keep.txt', 'utf8')).toBe('retained client output')
  await expect(readFile('output/server/stale.js')).rejects.toMatchObject({
    code: 'ENOENT',
  })

  // generation also supports cjs servers and the default web platform
  const cjs = await build(
    { ...options, build: { server: { outputFormat: 'cjs' } } },
    { step: 'generate' }
  )
  expect(cjs?.serverEntry).toBe(
    join(process.cwd(), 'output/server/_virtual_one-entry.cjs')
  )
  expect(await readFile(cjs!.serverEntry, 'utf8')).toContain('exports.render')
  expect(cjs?.clientManifest).toEqual(JSON.parse(manifest))
  await expect(readFile('output/server/_virtual_one-entry.js')).rejects.toMatchObject({
    code: 'ENOENT',
  })

  // full builds replace all previous output, including client and unrelated files
  await writeFile('output/stale.txt', 'old output')
  await build(options, { platform: 'web' })
  for (const path of ['output/stale.txt', 'output/client/keep.txt']) {
    await expect(readFile(path)).rejects.toMatchObject({ code: 'ENOENT' })
  }

  // disabling the server still produces a fresh client without reading a manifest
  const client = await build(
    { ...options, build: { server: false } },
    { platform: 'web' }
  )
  expect(client?.clientOutput?.length).toBeGreaterThan(0)
  expect(client?.serverOutput).toBeUndefined()
  expect(client?.clientManifest).toBeUndefined()
  await expect(readFile('output/server/_virtual_one-entry.js')).rejects.toMatchObject({
    code: 'ENOENT',
  })

  const clientOnlyGeneration = await build(
    { ...options, build: { server: false } },
    { step: 'generate' }
  )
  expect(clientOnlyGeneration?.clientOutput).toBeUndefined()
  expect(clientOnlyGeneration?.serverOutput).toBeUndefined()
  expect(await readFile(assetPath)).toEqual(asset)

  // native builds keep their existing whole-output cleanup even with a step argument
  for (const platform of ['ios', 'android', 'macos', 'linux'] as const) {
    await mkdir('output', { recursive: true })
    await writeFile('output/stale.txt', 'old native output')
    await build(options, { platform, step: 'generate' })
    await expect(readFile('output/stale.txt')).rejects.toMatchObject({ code: 'ENOENT' })
    expect(nativeBuild).toHaveBeenLastCalledWith(
      [],
      expect.anything(),
      expect.objectContaining({
        platform,
        bundleOutput: `output/${platform}.js`,
        assetsDest: 'output',
      })
    )
  }

  // generation requires an existing client build rather than manufacturing one
  await expect(build(options, { step: 'generate' })).rejects.toMatchObject({
    code: 'ENOENT',
    path: 'output/client/.vite/manifest.json',
  })
})
