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

type MiddlewareHandler = (
  req: object,
  res: object,
  next: (error?: unknown) => void
) => void | Promise<void>

type WatcherListener = (...args: string[]) => void | Promise<void>

describe('createFileSystemRouterPlugin', () => {
  const previousIsVxrnCli = process.env.IS_VXRN_CLI
  const previousViteEnvironment = process.env.VITE_ENVIRONMENT
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
    if (previousViteEnvironment === undefined) {
      delete process.env.VITE_ENVIRONMENT
    } else {
      process.env.VITE_ENVIRONMENT = previousViteEnvironment
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

  it('caches dev ssg html until the module runner is invalidated', async () => {
    process.env.VITE_ENVIRONMENT = 'ssr'
    tempRoot = mkdtempSync(path.join(tmpdir(), 'one-router-ssg-cache-'))
    const appDir = path.join(tempRoot, 'app')
    const routeFile = path.join(appDir, 'index+ssg.tsx')
    writeFileSync(path.join(tempRoot, 'package.json'), '{}\n')
    mkdirSync(appDir)
    writeFileSync(routeFile, 'export default function Index() { return null }\n')

    const { createServerModuleRunner } = await import('vite')
    const { createFileSystemRouterPlugin } = await import('./fileSystemRouterPlugin')
    const { virtualEntryId } = await import('./virtualEntryConstants')

    let renderCount = 0
    const render = vi.fn(async () => `<html><body>${++renderCount}</body></html>`)
    const runner = {
      clearCache: vi.fn(),
      import: vi.fn(async (id: string) => {
        if (id === virtualEntryId) {
          return { default: { render } }
        }
        if (id === routeFile) {
          return { default: () => null }
        }
        return {}
      }),
    }
    vi.mocked(createServerModuleRunner).mockReturnValue(runner as any)

    const middlewareHandlers: MiddlewareHandler[] = []
    const watcherListeners = new Map<string, WatcherListener[]>()
    const server = {
      environments: {
        ssr: {},
      },
      hot: {
        send: vi.fn(),
      },
      middlewares: {
        use: vi.fn((handler: MiddlewareHandler) => {
          middlewareHandlers.push(handler)
        }),
      },
      watcher: {
        add: vi.fn(),
        addListener: vi.fn((event: string, listener: WatcherListener) => {
          watcherListeners.set(event, [...(watcherListeners.get(event) || []), listener])
        }),
        on: vi.fn((event: string, listener: WatcherListener) => {
          watcherListeners.set(event, [...(watcherListeners.get(event) || []), listener])
        }),
      },
    }

    const plugin = createFileSystemRouterPlugin({
      router: {
        root: appDir,
      },
      server: {
        loggingEnabled: false,
      },
    })

    const installMiddlewares = (plugin as any).configureServer(server)
    installMiddlewares()

    const routeMiddleware = middlewareHandlers.at(-1)
    if (!routeMiddleware) {
      throw new Error('Expected route middleware to be registered')
    }
    const handleRouteRequest = routeMiddleware

    async function request(pathname: string) {
      const chunks: string[] = []
      const req = {
        originalUrl: pathname,
        url: pathname,
        headers: {
          host: 'localhost',
        },
        method: 'GET',
      }
      const res = {
        setHeader: vi.fn(),
        appendHeader: vi.fn(),
        writeHead: vi.fn(),
        write: vi.fn((chunk: string) => {
          chunks.push(chunk)
        }),
        end: vi.fn(),
      }
      const next = vi.fn((error?: unknown) => {
        if (error) {
          throw error
        }
        throw new Error('Expected One router middleware to handle request')
      })

      await handleRouteRequest(req, res, next)
      expect(res.end).toHaveBeenCalled()
      return chunks.join('')
    }

    await expect(request('/')).resolves.toContain('<body>1</body>')
    await expect(request('/')).resolves.toContain('<body>1</body>')
    expect(render).toHaveBeenCalledTimes(1)

    const allListeners = watcherListeners.get('all') || []
    const invalidateRunner = allListeners[0]
    if (!invalidateRunner) {
      throw new Error('Expected runner invalidation listener to be registered')
    }
    invalidateRunner('change', routeFile)

    await expect(request('/')).resolves.toContain('<body>2</body>')
    expect(render).toHaveBeenCalledTimes(2)
    expect(runner.clearCache).toHaveBeenCalledTimes(2)
  })
})
