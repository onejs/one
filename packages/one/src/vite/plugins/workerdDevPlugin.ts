import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { resolvePath } from '@vxrn/resolve'
import { cloudflare } from '@cloudflare/vite-plugin'
import { getPlatformEnvDefine } from '@vxrn/vite-plugin-metro'
import { exactRegex } from 'rolldown/filter'
import { type Plugin, type PluginOption } from 'vite'
import { CACHE_KEY } from '../../constants'
import { virtalEntryIdClient, virtualEntryId } from './virtualEntryConstants'
import { getManifest } from '../getManifest'
import { getRouterRootFromOneOptions } from '../../utils/getRouterRootFromOneOptions'
import type { RouteIndex } from '../../utils/routeIndex'
import type { One, RouteInfo } from '../types'
import {
  createCloudflareWranglerConfig,
  getCloudflareProjectNameSync,
  loadUserWranglerConfigSync,
  shouldEnableWorkerdDev,
} from '../cloudflareWranglerConfig'

export { shouldEnableWorkerdDev }

export const workerdDevEntryId = 'virtual:one-workerd-dev-entry'
const resolvedWorkerdDevEntryId = `\0${workerdDevEntryId}`

const WORKERD_DEV_DIR = 'node_modules/.one-workerd-dev'

function serveOnly(plugin: Plugin): Plugin {
  const existing = plugin.apply
  return {
    ...plugin,
    apply(config, env) {
      if (env.command !== 'serve') return false
      if (typeof existing === 'function') return existing(config, env)
      if (existing === 'build') return false
      return true
    },
  }
}

function toImportHref(root: string, routerRoot: string, routeFile: string): string {
  const rel = routeFile.replace(/^\.\//, '')
  return pathToFileURL(resolve(root, routerRoot, rel)).href
}

function serializeImportMap(entries: Array<[string, string]>): string {
  return entries
    .map(
      ([key, href]) => `  ${JSON.stringify(key)}: () => import(${JSON.stringify(href)})`
    )
    .join(',\n')
}

function stripRouteForWorker(route: RouteInfo): RouteInfo {
  const { layouts, middlewares, ...rest } = route
  return {
    ...rest,
    // live-render SSG in dev the same way the node middleware does
    type: route.type === 'ssg' ? 'ssr' : route.type,
    layouts: layouts?.map((layout) => ({
      contextKey: layout.contextKey,
    })) as RouteInfo['layouts'],
    middlewares: middlewares?.map((middleware) => ({
      contextKey: middleware.contextKey,
    })) as RouteInfo['middlewares'],
  }
}

function stubRouteBuildInfo(
  route: RouteInfo,
  preloads: string[]
): One.BuildInfo['routeToBuildInfo'][string] {
  const pageType = route.type === 'ssg' ? 'ssr' : route.type
  return {
    type: pageType,
    path: route.page,
    routeFile: route.file,
    middlewares: route.middlewares?.map((middleware) => middleware.contextKey) ?? [],
    preloadPath: '',
    cssPreloadPath: '',
    loaderPath: '',
    cleanPath: route.urlCleanPath || route.page,
    htmlPath: '',
    clientJsPath: '',
    serverJsPath: '',
    params: {},
    preloads,
    css: [],
    layoutCSS: [],
  }
}

export function generateWorkerdDevEntryModule(args: {
  root: string
  options: One.PluginOptions
  routerRoot: string
  routePaths: string[]
  preloads: string[]
}): string {
  const { root, options, routerRoot, routePaths, preloads } = args
  const manifest = getManifest({
    routerRoot: resolve(root, routerRoot),
    ignoredRouteFiles: options.router?.ignoredRouteFiles,
    routePaths,
  })

  if (!manifest) {
    throw new Error('[one] workerd dev: no routes manifest')
  }

  const apiImports = new Map<string, string>()
  const middlewareImports = new Map<string, string>()
  const routeToBuildInfo: One.BuildInfo['routeToBuildInfo'] = {}

  for (const route of manifest.pageRoutes) {
    for (const middleware of route.middlewares || []) {
      if (!middleware.contextKey || middlewareImports.has(middleware.contextKey)) continue
      middlewareImports.set(
        middleware.contextKey,
        toImportHref(root, routerRoot, middleware.contextKey)
      )
    }
    if (route.file) {
      routeToBuildInfo[route.file] = stubRouteBuildInfo(route, preloads)
    }
  }

  for (const route of manifest.apiRoutes) {
    if (route.file) {
      apiImports.set(route.page, toImportHref(root, routerRoot, route.file))
    }
    for (const middleware of route.middlewares || []) {
      if (!middleware.contextKey || middlewareImports.has(middleware.contextKey)) continue
      middlewareImports.set(
        middleware.contextKey,
        toImportHref(root, routerRoot, middleware.contextKey)
      )
    }
  }

  const pageRoutes = manifest.pageRoutes.map(stripRouteForWorker)
  const apiRoutes = manifest.apiRoutes.map(stripRouteForWorker)

  const buildInfo: One.BuildInfo = {
    constants: { CACHE_KEY },
    oneOptions: options,
    routeToBuildInfo,
    pathToRoute: {},
    routeMap: {},
    manifest: {
      pageRoutes,
      apiRoutes,
      allRoutes: [...pageRoutes, ...apiRoutes],
    },
    preloads: Object.fromEntries(preloads.map((preload) => [preload, true])),
    cssPreloads: {},
    loaders: {},
  }

  const spaPreloadScripts = preloads
    .map((preload) => `<script type="module" src="${preload}"></script>`)
    .join('')

  return `if (typeof MessageChannel === 'undefined') {
  globalThis.MessageChannel = class MessageChannel {
    constructor() {
      this.port1 = { postMessage: () => {}, onmessage: null, close: () => {} }
      this.port2 = { postMessage: () => {}, onmessage: null, close: () => {} }
    }
  }
}

import { serve, setFetchStaticHtml } from 'one/serve-worker'

const lazyRoutes = {
  serverEntry: () => import(${JSON.stringify(virtualEntryId)}),
  api: {
${serializeImportMap([...apiImports])}
  },
  middlewares: {
${serializeImportMap([...middlewareImports])}
  }
}

const buildInfo = ${JSON.stringify(buildInfo)}

let server

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const pathname = url.pathname

    if (pathname === '/status' || pathname.startsWith('/status?')) {
      return new Response('packager-status:running', {
        headers: { 'content-type': 'text/plain' },
      })
    }

    if (!server) {
      server = await serve(buildInfo, lazyRoutes, { disableModuleCache: true })
    }

    if (env && env.ASSETS) {
      setFetchStaticHtml(async (path) => {
        try {
          const assetUrl = new URL(request.url)
          assetUrl.pathname = path
          const assetResponse = await env.ASSETS.fetch(new Request(assetUrl))
          if (assetResponse && assetResponse.ok) {
            return await assetResponse.text()
          }
        } catch {}
        return null
      })
    }

    try {
      const response = await server.fetch(request, env, ctx)

      if (!response || response.status === 404) {
        if (env && env.ASSETS) {
          try {
            const assetResponse = await env.ASSETS.fetch(request)
            if (assetResponse && assetResponse.status !== 404) {
              return assetResponse
            }
          } catch {}
        }
      }

      if (!response) {
        if (request.method === 'GET' || request.method === 'HEAD') {
          return new Response(
            '<!DOCTYPE html><html><head>' +
              ${JSON.stringify(spaPreloadScripts)} +
              '</head></html>',
            { headers: { 'content-type': 'text/html' } }
          )
        }
        return new Response('Not Found', { status: 404 })
      }

      return response
    } finally {
      setFetchStaticHtml(null)
    }
  }
}
`
}

export function createWorkerdDevPlugins(
  options: One.PluginOptions,
  root: string,
  routeIndex: RouteIndex
): PluginOption[] {
  if (!shouldEnableWorkerdDev(options.web?.deploy, root)) {
    return []
  }

  const cacheDir = join(root, WORKERD_DEV_DIR)
  const wranglerInputPath = join(cacheDir, '_wrangler.input.jsonc')
  const workerEntryPath = join(cacheDir, 'worker-entry.js')

  mkdirSync(cacheDir, { recursive: true })
  writeFileSync(
    workerEntryPath,
    `export { default } from ${JSON.stringify(workerdDevEntryId)}\n`
  )

  const userWranglerConfig = loadUserWranglerConfigSync(root)
  const projectName = getCloudflareProjectNameSync(root)
  const wranglerInputConfig = createCloudflareWranglerConfig(
    projectName,
    userWranglerConfig?.config
  )
  // wrangler resolves `main` relative to the config file, which lives in cacheDir
  wranglerInputConfig.main = 'worker-entry.js'
  writeFileSync(wranglerInputPath, `${JSON.stringify(wranglerInputConfig, null, 2)}\n`)

  const preloads = options.web?.experimentalBundledDev
    ? ['/bundledDevClient.mjs', '/assets/_virtual_one-entry.js']
    : ['/@vite/client', virtalEntryIdClient]

  const empty = resolvePath('@vxrn/vite-plugin-metro/empty', root)
  const rnWebPkg = resolvePath('react-native-web/package.json', root)
  const rnWeb = resolvePath('react-native-web', root)
  const safeArea = resolvePath('@vxrn/safe-area', root)

  const preparePlugin: Plugin = {
    name: 'one:workerd-dev-prepare',
    apply: 'serve',
    enforce: 'pre',

    config() {
      return {
        environments: {
          worker: {
            define: {
              ...getPlatformEnvDefine('ssr'),
              'process.env.TAMAGUI_IS_SERVER': JSON.stringify('1'),
              'process.env.TAMAGUI_KEEP_THEMES': JSON.stringify('1'),
              'process.env.ONE_CACHE_KEY': JSON.stringify(CACHE_KEY),
            },
            optimizeDeps: {
              include: [
                'react',
                'react-dom',
                'react-dom/client',
                'react-dom/server.browser',
                'react/jsx-runtime',
                'react/jsx-dev-runtime',
              ],
            },
            build: {
              rolldownOptions: {
                shimMissingExports: true,
              },
            },
          },
        },
      }
    },

    // environment resolve options have no alias field; match the production
    // worker aliases with a worker-only resolveId (rolldown cannot parse RN Flow)
    resolveId: {
      filter: {
        id: /^(react-native(\/|$)|react-native-safe-area-context$)/,
      },
      handler(source) {
        if (this.environment.name !== 'worker') return
        if (/^react-native\/Libraries\//.test(source)) return empty
        if (source === 'react-native/package.json') return rnWebPkg
        if (source === 'react-native') return rnWeb
        if (source === 'react-native-safe-area-context') return safeArea
      },
    },

    configureServer(server) {
      if (!server.environments.worker) {
        throw new Error(
          '[one] ONE_EXPERIMENTAL_WORKER_DEV=1 is set but @cloudflare/vite-plugin did not register a "worker" environment. ' +
            `Expected wrangler config at ${wranglerInputPath}.`
        )
      }
      console.info(
        '[one] experimental workerd dev enabled (ONE_EXPERIMENTAL_WORKER_DEV=1)'
      )
    },
  }

  const virtualPlugin: Plugin = {
    name: 'one:workerd-dev-entry',
    apply: 'serve',

    resolveId: {
      filter: { id: exactRegex(workerdDevEntryId) },
      handler(id) {
        if (this.environment.name !== 'worker') return
        if (id === workerdDevEntryId) return resolvedWorkerdDevEntryId
      },
    },

    load: {
      filter: { id: exactRegex(resolvedWorkerdDevEntryId) },
      handler() {
        if (this.environment.name !== 'worker') return
        return generateWorkerdDevEntryModule({
          root,
          options,
          routerRoot: getRouterRootFromOneOptions(options),
          routePaths: routeIndex.getPaths(),
          preloads,
        })
      },
    },

    hotUpdate({ file }) {
      if (this.environment.name !== 'worker') return
      const graph = this.environment.moduleGraph
      const entry = graph.getModuleById(resolvedWorkerdDevEntryId)
      if (!entry) return
      const modules = graph.getModulesByFile(file)
      if (!modules?.size) return
      graph.invalidateModule(entry)
    },
  }

  const cloudflarePlugins = cloudflare({
    configPath: wranglerInputPath,
    viteEnvironment: { name: 'worker' },
  }).map(serveOnly)

  return [preparePlugin, virtualPlugin, ...cloudflarePlugins]
}
