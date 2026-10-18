import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { ViteDevServer } from 'vite'

export type RozeniteHostOptions = {
  enabled?: boolean
  include?: string[]
  exclude?: string[]
  pluginDisplay?: 'sidebar' | 'tabs'
}

type RozeniteModule = {
  initializeRozenite: (
    options: {
      projectRoot: string
      include?: string[]
      exclude?: string[]
      pluginDisplay?: 'sidebar' | 'tabs'
      logLevel?: 'silent' | 'info' | 'debug'
    },
    runtimeVersion?: string
  ) => Promise<{
    middleware: unknown
    dispose: () => Promise<void>
  }>
  createScopedMiddleware: (namespace: string, middleware: unknown) => unknown
}

const MOUNT_PATH = '/rozenite'

/** Resolve a dependency from the app. */
function resolveFromProject(projectRoot: string, id: string): string | undefined {
  try {
    return createRequire(path.join(projectRoot, 'package.json')).resolve(id)
  } catch {
    return undefined
  }
}

function findPackageRoot(packageName: string, resolvedPath: string): string | undefined {
  const nodeModules = `${path.sep}node_modules${path.sep}`
  const marker = nodeModules + packageName.split('/').join(path.sep) + path.sep
  const index = resolvedPath.indexOf(marker)
  if (index !== -1) {
    return resolvedPath.slice(0, index + marker.length - 1)
  }

  let current = path.dirname(resolvedPath)
  while (current !== path.dirname(current)) {
    const packageJsonPath = path.join(current, 'package.json')
    if (existsSync(packageJsonPath)) {
      try {
        if (JSON.parse(readFileSync(packageJsonPath, 'utf8')).name === packageName) {
          return current
        }
      } catch {}
    }
    current = path.dirname(current)
  }
}

function readDependencyNames(projectRoot: string): string[] {
  const packageJsonPath = path.join(projectRoot, 'package.json')
  if (!existsSync(packageJsonPath)) return []

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    return Array.from(
      new Set([
        ...Object.keys(packageJson.dependencies ?? {}),
        ...Object.keys(packageJson.devDependencies ?? {}),
      ])
    )
  } catch {
    return []
  }
}

/**
 * Find Rozenite plugin packages the same way Rozenite's middleware does: a
 * direct dependency with a built `dist/rozenite.json` manifest. Finding them
 * up front lets One keep the stock React Native DevTools frontend when no
 * plugin is installed instead of mounting an empty Rozenite shell.
 */
export function findInstalledRozenitePlugins(projectRoot: string): string[] {
  const plugins: string[] = []

  for (const dependency of readDependencyNames(projectRoot)) {
    const resolved = resolveFromProject(projectRoot, dependency)
    if (!resolved) continue

    const packageRoot = findPackageRoot(dependency, resolved)
    if (packageRoot && existsSync(path.join(packageRoot, 'dist', 'rozenite.json'))) {
      plugins.push(dependency)
    }
  }

  return plugins
}

export type StartedRozeniteHost = {
  plugins: string[]
  dispose: () => Promise<void>
}

/**
 * Mounts Rozenite's React Native DevTools plugin host into One's dev server.
 *
 * Rozenite already owns the extension convention, plugin discovery, panel
 * rendering and the CDP bridge. One's job is only to serve it on the same dev
 * server as React Native's debugger and patch the debugger frontend URL, which
 * Rozenite's middleware does when it initializes. Returning null means there
 * was nothing to host, so the stock React Native DevTools stays untouched.
 */
export async function startRozeniteHost(
  server: ViteDevServer,
  projectRoot: string,
  options: RozeniteHostOptions = {}
): Promise<StartedRozeniteHost | null> {
  if (options.enabled === false) return null

  const discovered = options.include ?? findInstalledRozenitePlugins(projectRoot)
  const plugins = discovered.filter((plugin) => !options.exclude?.includes(plugin))

  if (plugins.length === 0) return null

  let rozenite: RozeniteModule
  try {
    // One depends on @rozenite/middleware, so this resolves from One's own
    // package in every layout, including pnpm's strict node_modules.
    rozenite = (await import('@rozenite/middleware')) as unknown as RozeniteModule
  } catch (error) {
    console.warn(`[one] Rozenite plugins are configured but @rozenite/middleware could not load: ${String(error)}`)
    return null
  }

  try {
    const instance = await rozenite.initializeRozenite(
      {
        projectRoot,
        include: options.include ? plugins : undefined,
        exclude: options.exclude,
        pluginDisplay: options.pluginDisplay,
        logLevel: process.env.ONE_DEVTOOLS_DEBUG ? 'debug' : 'info',
      },
      undefined
    )

    server.middlewares.use(
      rozenite.createScopedMiddleware(MOUNT_PATH, instance.middleware) as any
    )

    console.info(
      plugins.length > 0
        ? `[one] React Native DevTools plugins: ${plugins.join(', ')} (open with dt or j)`
        : '[one] React Native DevTools plugins enabled (open with dt or j)'
    )

    let disposed = false
    return {
      plugins,
      dispose: async () => {
        if (disposed) return
        disposed = true
        await instance.dispose()
      },
    }
  } catch (error) {
    console.warn(`[one] Failed to start the Rozenite devtools host: ${String(error)}`)
    return null
  }
}
