import { mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildNativeBundle: vi.fn(),
  getBuildBundleFn: vi.fn(),
  loadConfigFromFile: vi.fn(),
  loadEnv: vi.fn(),
}))

vi.mock('@vxrn/vite-plugin-metro/rn-commands', () => ({
  bundle: { getBuildBundleFn: mocks.getBuildBundleFn },
}))
vi.mock('../../utils/createNativeDevEngine', () => ({
  buildNativeBundle: mocks.buildNativeBundle,
}))
vi.mock('../../exports/loadEnv', () => ({ loadEnv: mocks.loadEnv }))
vi.mock('vite', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vite')>()),
  loadConfigFromFile: mocks.loadConfigFromFile,
}))

import { withNativePlugin } from '../../nativePlugin'
import { buildBundle } from './buildBundle'

const root = path.join(import.meta.dirname, '.bundle-command-fixture')
const bundleOutput = path.join(root, 'android.js')

afterEach(async () => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.clearAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('React Native bundle command', () => {
  it('loads native providers from the project Vite config', async () => {
    vi.useFakeTimers()
    await mkdir(root, { recursive: true })
    const provider = withNativePlugin({ name: 'shared' }, ({ platform }) => ({
      name: `shared-${platform}`,
    }))
    mocks.getBuildBundleFn.mockResolvedValue(null)
    mocks.loadConfigFromFile.mockResolvedValue({
      path: path.join(root, 'vite.config.ts'),
      config: { plugins: [provider] },
      dependencies: [],
    })
    mocks.buildNativeBundle.mockResolvedValue({ code: 'native bundle', map: null })

    await buildBundle(
      [],
      { root },
      {
        entryFile: '',
        resetCache: true,
        resetGlobalCache: true,
        platform: 'android',
        dev: false,
        bundleOutput,
        sourcemapUseAbsolutePath: true,
        verbose: false,
        unstableTransformProfile: '',
      }
    )

    expect(mocks.loadConfigFromFile).toHaveBeenCalledWith(
      { command: 'build', mode: 'prod' },
      undefined,
      root
    )
    expect(mocks.buildNativeBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        root,
        platform: 'android',
        plugins: [expect.objectContaining({ name: 'shared-android' })],
      })
    )
    expect(await readFile(bundleOutput, 'utf8')).toBe('native bundle')
  })
})
