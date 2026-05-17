import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vite', async () => {
  const actual = await vi.importActual<typeof import('vite')>('vite')
  return {
    ...actual,
    createServerModuleRunner: vi.fn(() => ({
      clearCache: vi.fn(),
      import: vi.fn(),
    })),
  }
})

describe('createFileSystemRouterPlugin', () => {
  const previousIsVxrnCli = process.env.IS_VXRN_CLI
  let previousVxrnPluginConfig: unknown
  let tempRoot: string | undefined

  beforeEach(() => {
    previousVxrnPluginConfig = (globalThis as any).__vxrnPluginConfig__
  })

  afterEach(() => {
    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true })
      tempRoot = undefined
    }

    if (previousIsVxrnCli === undefined) {
      delete process.env.IS_VXRN_CLI
    } else {
      process.env.IS_VXRN_CLI = previousIsVxrnCli
    }

    if (previousVxrnPluginConfig === undefined) {
      delete (globalThis as any).__vxrnPluginConfig__
    } else {
      ;(globalThis as any).__vxrnPluginConfig__ = previousVxrnPluginConfig
    }
    vi.restoreAllMocks()
  })

  it('keeps route watcher rebuild errors handled', async () => {
    process.env.IS_VXRN_CLI = '1'
    tempRoot = mkdtempSync(path.join(tmpdir(), 'one-router-watch-'))
    const appDir = path.join(tempRoot, 'app')
    writeFileSync(path.join(tempRoot, 'package.json'), '{}\n')
    mkdirSync(appDir)
    writeFileSync(
      path.join(appDir, 'index.tsx'),
      'export default function Index() { return null }\n'
    )

    ;(globalThis as any).__vxrnPluginConfig__ = {
      web: {
        defaultRenderMode: 'ssg',
      },
    }

    const { createFileSystemRouterPlugin } = await import('./fileSystemRouterPlugin')
    const plugin = createFileSystemRouterPlugin({
      router: {
        root: appDir,
      },
    })

    let watcherListener:
      | ((event: string, changedPath: string) => void | Promise<void>)
      | undefined
    const server = {
      environments: {
        ssr: {},
      },
      watcher: {
        addListener: vi.fn((event: string, listener: typeof watcherListener) => {
          if (event === 'all') {
            watcherListener = listener
          }
        }),
        on: vi.fn(),
      },
    }

    ;(plugin as any).configureServer(server)
    expect(watcherListener).toBeDefined()

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    delete (globalThis as any).__vxrnPluginConfig__

    if (!watcherListener) {
      throw new Error('Expected route watcher listener to be registered')
    }

    await expect(
      Promise.resolve(watcherListener('add', path.join(appDir, 'new-route.tsx')))
    ).resolves.toBeUndefined()

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[one] Failed to rebuild routes'),
      expect.any(Error)
    )
  })
})
