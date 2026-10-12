import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vite', async () => {
  const actual = await vi.importActual<typeof import('vite')>('vite')
  return {
    ...actual,
    createServerModuleRunner: vi.fn(() => ({
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
  const previousVxrnVersion = globalThis['__vxrnVersion']
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
    globalThis['__vxrnVersion'] = previousVxrnVersion
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

    const { createRouteIndex } = await import('../../utils/routeIndex')
    const { createFileSystemRouterPlugin } = await import('./fileSystemRouterPlugin')
    const plugin = createFileSystemRouterPlugin(
      {
        router: {
          root: appDir,
        },
      },
      createRouteIndex({ routerRoot: appDir })
    )

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

  it('does not install the node request middleware when a worker environment exists', async () => {
    process.env.IS_VXRN_CLI = '1'
    tempRoot = mkdtempSync(path.join(tmpdir(), 'one-router-worker-'))
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

    const { createRouteIndex } = await import('../../utils/routeIndex')
    const { createFileSystemRouterPlugin } = await import('./fileSystemRouterPlugin')
    const plugin = createFileSystemRouterPlugin(
      {
        router: { root: appDir },
      },
      createRouteIndex({ routerRoot: appDir })
    )

    const use = vi.fn()
    const server = {
      environments: {
        ssr: {},
        worker: { moduleGraph: { getModuleById: vi.fn() } },
      },
      middlewares: { use },
      watcher: {
        addListener: vi.fn(),
        on: vi.fn(),
      },
    }

    const installMiddlewares = (plugin as any).configureServer(server)
    installMiddlewares()
    expect(use).not.toHaveBeenCalled()
  })

  it('caches dev ssg html and serves loader data without evaluating the page', async () => {
    process.env.VITE_ENVIRONMENT = 'ssr'
    tempRoot = mkdtempSync(path.join(tmpdir(), 'one-router-ssg-cache-'))
    const appDir = path.join(tempRoot, 'app')
    const routeFile = path.join(appDir, 'index+ssg.tsx')
    writeFileSync(path.join(tempRoot, 'package.json'), '{}\n')
    mkdirSync(appDir)
    writeFileSync(routeFile, 'export default function Index() { return null }\n')

    const { createServerModuleRunner } = await import('vite')
    const { createRouteIndex } = await import('../../utils/routeIndex')
    const { createFileSystemRouterPlugin } = await import('./fileSystemRouterPlugin')
    const { virtualEntryId } = await import('./virtualEntryConstants')

    let renderCount = 0
    let loaderData: unknown
    const loader = vi.fn(() => loaderData)
    const render = vi.fn(async () => `<html><body>${++renderCount}</body></html>`)
    const runner = {
      import: vi.fn(async (id: string) => {
        if (id === virtualEntryId) {
          return { default: { render } }
        }
        if (id === routeFile) {
          return { default: () => null, loader }
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
        ios: {},
        android: {},
      },
      transformRequest: vi.fn(async () => ({
        code: 'throw new Error("the loader endpoint evaluated the page"); export default function Index() { return null }',
      })),
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

    const plugin = createFileSystemRouterPlugin(
      {
        router: {
          root: appDir,
        },
        server: {
          loggingEnabled: false,
        },
      },
      createRouteIndex({ routerRoot: appDir })
    )

    const installMiddlewares = (plugin as any).configureServer(server)
    installMiddlewares()

    const routeMiddleware = middlewareHandlers.at(-1)
    if (!routeMiddleware) {
      throw new Error('Expected route middleware to be registered')
    }
    const handleRouteRequest = routeMiddleware

    async function request(pathname: string) {
      const chunks: string[] = []
      const req = Object.assign(new EventEmitter(), {
        aborted: false,
        complete: true,
        originalUrl: pathname,
        url: pathname,
        headers: {
          ':authority': 'localhost',
          ':method': 'GET',
        },
        method: 'GET',
      })
      const res = Object.assign(new EventEmitter(), {
        destroyed: false,
        writableFinished: false,
        setHeader: vi.fn(),
        appendHeader: vi.fn(),
        writeHead: vi.fn(),
        write: vi.fn((chunk: string) => {
          chunks.push(chunk)
          return true
        }),
        end: vi.fn(() => {
          res.writableFinished = true
          res.emit('finish')
        }),
      })
      const finished = new Promise<void>((resolve, reject) => {
        res.once('finish', resolve)
        res.once('error', reject)
      })
      const next = vi.fn((error?: unknown) => {
        if (error) {
          throw error
        }
        throw new Error('Expected One router middleware to handle request')
      })

      await handleRouteRequest(req, res, next)
      await finished
      expect(res.end).toHaveBeenCalled()
      if (pathname === '/') {
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8')
      }
      return chunks.join('')
    }

    await expect(request('/')).resolves.toContain('<body>1</body>')
    await expect(request('/')).resolves.toContain('<body>1</body>')
    expect(render).toHaveBeenCalledTimes(1)

    const versionBeforeChange = globalThis['__vxrnVersion']
    // vite calls hotUpdate on the ssr environment after invalidating the graph;
    // that is what tells the next render its route tree is built out of pre-edit
    // modules
    ;(plugin as any).hotUpdate.call(
      {
        environment: {
          name: 'ssr',
          moduleGraph: { getModulesByFile: () => new Set([{ id: routeFile }]) },
        },
      },
      { file: routeFile }
    )

    await expect(request('/')).resolves.toContain('<body>2</body>')
    expect(render).toHaveBeenCalledTimes(2)

    // the render also has to invalidate the route context the tree is built
    // from, otherwise it renders fresh html out of pre-edit route modules
    expect(globalThis['__vxrnVersion']).toBe((versionBeforeChange || 0) + 1)

    const { getLoaderPath } = await import('../../utils/cleanUrl')
    const loaderPath = getLoaderPath('/', true)
    const importsBeforeLoaderRequest = runner.import.mock.calls.length
    loader.mockClear()

    for (const platform of ['web', 'ios', 'android', 'native']) {
      const body = await request(`${loaderPath}?platform=${platform}`)
      const exports: { loader?: () => unknown } = {}
      new Function(
        'exports',
        body
          .replace('export default ', '')
          .replace('export function loader', 'exports.loader = function')
      )(exports)
      expect(exports.loader).toBeTypeOf('function')
      expect(exports.loader?.()).toBeUndefined()
    }
    expect(runner.import).toHaveBeenCalledTimes(importsBeforeLoaderRequest)
    expect(loader).not.toHaveBeenCalled()

    server.transformRequest.mockResolvedValue({
      code: 'throw new Error("the loader endpoint evaluated the page"); export function loader() { return "route-id-stub" }',
    })
    for (const value of [undefined, null, false, 0, '', { ready: true }]) {
      loaderData = value
      for (const platform of ['web', 'ios', 'android', 'native']) {
        const body = await request(`${loaderPath}?platform=${platform}`)
        const exports: { loader?: () => unknown } = {}
        new Function(
          'exports',
          body
            .replace('export default ', '')
            .replace('export function loader', 'exports.loader = function')
        )(exports)
        expect(exports.loader).toBeTypeOf('function')
        expect(exports.loader?.()).toEqual(value)
      }
    }
    expect(loader).toHaveBeenCalledTimes(24)
  })
})
