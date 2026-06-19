import path from 'node:path'
import { Readable } from 'node:stream'
import { debounce } from 'perfect-debounce'
import colors from 'picocolors'
import type { Connect, Plugin, ViteDevServer } from 'vite'
import { createServerModuleRunner, normalizePath } from 'vite'
import type { ModuleRunner } from 'vite/module-runner'
import { getSpaHeaderElements } from '../../constants'
import { createHandleRequest } from '../../createHandleRequest'
import type { RouteNode } from '../../router/Route' // used for type in runLoaderWithTracking
import type { RenderAppProps } from '../../types'
import { getPageExport } from '../../utils/getPageExport'
import { getRouterRootFromOneOptions } from '../../utils/getRouterRootFromOneOptions'
import { isResponse } from '../../utils/isResponse'
import { isStatusRedirect } from '../../utils/isStatus'
import { promiseWithResolvers } from '../../utils/promiseWithResolvers'
import { isRouteFileWatchEvent } from '../../utils/routeFileWatch'
import { trackLoaderDependencies } from '../../utils/trackLoaderDependencies'
import { replaceLoader } from '../../vite/replaceLoader'
import type { One, RouteInfo } from '../../vite/types'
import { setServerContext } from '../one-server-only'
import { virtalEntryIdClient, virtualEntryId } from './virtualEntryConstants'

const debugRouter = process.env.ONE_DEBUG_ROUTER
const debugLoaderDeps = process.env.ONE_DEBUG_LOADER_DEPS

const routeTypeColors: Record<string, (s: string) => string> = {
  ssg: colors.green,
  ssr: colors.blue,
  spa: colors.yellow,
  api: colors.magenta,
}

// server needs better dep optimization
const USE_SERVER_ENV = false //!!process.env.USE_SERVER_ENV

export function createFileSystemRouterPlugin(options: One.PluginOptions): Plugin {
  const preloads = ['/@vite/client', virtalEntryIdClient]

  let runner: ModuleRunner
  let server: ViteDevServer

  // Only clear the SSR module runner cache when a file actually changed, not on
  // every request. Clearing per-request forces a full re-evaluation of the whole
  // server module tree (new AsyncFunction per module) on each page render, which
  // leaks heap unboundedly under sustained navigation (→ 5-8GB RSS / OOM) and also
  // re-transforms every module. The file watcher below flips this back to true.
  let needsCacheClear = true

  // Track file dependencies from loaders for hot reload
  // Maps file path -> set of route paths that depend on it
  // Track file dependencies from loaders for hot reload.
  // Maps file path -> set of route paths that depend on it.
  // Limited to prevent unbounded growth in long dev sessions.
  const loaderFileDependencies = new Map<string, Set<string>>()
  const LOADER_DEPS_MAX = 2000

  function setBoundedLoaderDep(filePath: string, routePath: string) {
    let deps = loaderFileDependencies.get(filePath)
    if (!deps) {
      if (loaderFileDependencies.size >= LOADER_DEPS_MAX) {
        const firstKey = loaderFileDependencies.keys().next().value
        if (firstKey !== undefined) {
          loaderFileDependencies.delete(firstKey as string)
        }
      }
      deps = new Set()
      loaderFileDependencies.set(filePath, deps)
      server?.watcher.add(filePath)
    }
    deps.add(routePath)
  }

  let handleRequest = createRequestHandler()
  // handle only one at a time in dev mode to avoid "Detected multiple renderers concurrently" errors
  let renderPromise: Promise<void> | null = null
  const ssgHtmlCache = new Map<string, string>()

  function getSsgHtmlCacheKey(route: RouteInfo<string>, url: URL) {
    return `${route.file}\n${url.pathname}\n${url.search}`
  }

  function createRequestHandler() {
    const routerRoot = getRouterRootFromOneOptions(options)

    // find the nearest +not-found route by walking up from a route's directory
    async function findNearestNotFoundPath(routeFile: string): Promise<string> {
      const routeDir = routeFile.replace(/\/[^/]+$/, '')
      let searchDir = routeDir
      while (true) {
        for (const ext of ['.tsx', '.ts', '.jsx', '.js']) {
          const candidate = path.join(routerRoot, searchDir, `+not-found${ext}`)
          try {
            const mod = await runner.import(candidate)
            if (mod?.default) {
              return searchDir ? `/${searchDir}/+not-found` : '/+not-found'
            }
          } catch {
            // not found at this level
          }
        }
        if (!searchDir) break
        const parent = searchDir.replace(/\/[^/]+$/, '')
        if (parent === searchDir) {
          searchDir = ''
        } else {
          searchDir = parent
        }
      }
      return '/+not-found'
    }

    return createHandleRequest(
      {
        async handlePage({ route, url, loaderProps }) {
          const ssgCacheKey = route.type === 'ssg' ? getSsgHtmlCacheKey(route, url) : null
          if (ssgCacheKey && !needsCacheClear) {
            const cachedHtml = ssgHtmlCache.get(ssgCacheKey)
            if (cachedHtml) {
              return cachedHtml
            }
          }

          if (options.server?.loggingEnabled !== false) {
            const colorType = routeTypeColors[route.type] || colors.white
            const pathname =
              typeof url === 'string' ? new URL(url).pathname : url.pathname
            const file = route.isNotFound
              ? colors.red('404')
              : colors.dim(`app/${route.file.slice(2)}`)
            console.info(
              ` ⓵  ${colorType(`[${route.type}]`)} ${pathname} ${colors.dim('→')} ${file}`
            )
          }

          // spa-shell: render layout shell for SPA pages whose parent layouts have ssg/ssr render mode
          const layouts = (route.layouts || []) as RouteNode[]
          const isSpaShell =
            route.type === 'spa' &&
            layouts.some(
              (layout) =>
                layout.layoutRenderMode === 'ssg' || layout.layoutRenderMode === 'ssr'
            )

          if (route.type === 'spa' && !isSpaShell) {
            // render just the layouts? route.layouts
            return `<!DOCTYPE html><html><head>
            ${getSpaHeaderElements({ serverContext: { mode: 'spa' } })}
            <script type="module" src="/@one/dev.js"></script>
            <script type="module" src="/@vite/client" async=""></script>
            <script type="module" src="/@id/__x00__virtual:one-entry" async=""></script>
          </head></html>`
          }

          if (renderPromise) {
            await renderPromise
          }

          if (ssgCacheKey && !needsCacheClear) {
            const cachedHtml = ssgHtmlCache.get(ssgCacheKey)
            if (cachedHtml) {
              return cachedHtml
            }
          }

          const { promise, resolve: resolveRender } = promiseWithResolvers<void>()
          renderPromise = promise

          try {
            // route.file is '' for the auto-generated placeholder +not-found
            // route that getRoutes.ts injects when no user-defined one exists.
            // path.join(routerRoot, '') would resolve to routerRoot ('app'),
            // so we must branch on route.file, not the joined path.
            const isGeneratedNotFound = route.file === ''
            const routeFile = isGeneratedNotFound ? '' : path.join(routerRoot, route.file)
            if (needsCacheClear) {
              runner.clearCache()
              ssgHtmlCache.clear()
              needsCacheClear = false
            }

            globalThis['__vxrnresetState']?.()

            const exported = isGeneratedNotFound ? {} : await runner.import(routeFile)

            // helper to run a loader and track dependencies
            async function runLoaderWithTracking(
              routeNode: RouteNode | { contextKey: string; file?: string },
              loaderFn: ((props: any) => any) | undefined
            ): Promise<{ loaderData: any; routeId: string; isEnoent?: boolean }> {
              const routeId = routeNode.contextKey
              if (!loaderFn) {
                return { loaderData: undefined, routeId }
              }

              try {
                const tracked = await trackLoaderDependencies(() => loaderFn(loaderProps))

                // register dependencies for HMR
                const routePath = loaderProps?.path || '/'
                for (const dep of tracked.dependencies) {
                  const absoluteDep = path.resolve(dep)
                  setBoundedLoaderDep(absoluteDep, routePath)
                  if (debugLoaderDeps) {
                    console.info(` ⓵  [loader-dep] watching: ${absoluteDep}`)
                  }
                }

                return { loaderData: tracked.result, routeId }
              } catch (err) {
                // if a loader throws a Response (redirect), re-throw it
                if (isResponse(err)) {
                  throw err
                }
                // ENOENT = file not found in loader (e.g. invalid slug for MDX/data file)
                if ((err as any)?.code === 'ENOENT') {
                  return { loaderData: undefined, routeId, isEnoent: true }
                }
                console.error(`[one] Error running loader for ${routeId}:`, err)
                return { loaderData: undefined, routeId }
              }
            }

            let loaderData: any
            let matches: One.RouteMatch[]
            let pageResult:
              | { loaderData: any; routeId: string; isEnoent?: boolean }
              | undefined

            if (isSpaShell) {
              // spa-shell: run layout loaders (page content is client-rendered)
              const layoutLoaderPromises = layouts.map(async (layout) => {
                const layoutFile = path.join(routerRoot, layout.contextKey)
                const layoutExported = await runner.import(layoutFile)
                return runLoaderWithTracking(layout, layoutExported.loader)
              })
              const layoutResults = await Promise.all(layoutLoaderPromises)
              matches = layoutResults.map((result) => ({
                routeId: result.routeId,
                pathname: loaderProps?.path || '/',
                params: loaderProps?.params || {},
                loaderData: result.loaderData,
              }))

              // don't pass loaderData for spa-shell - the page loader runs on client
              // passing {} here would make useLoaderState think data is preloaded
              loaderData = undefined
            } else {
              // collect all routes to run loaders for (layouts + page)
              const layoutRoutes = (route.layouts || []) as RouteNode[]
              const pageRoute = { contextKey: route.file, file: route.file }

              // run all layout loaders in parallel
              const layoutLoaderPromises = layoutRoutes.map(async (layout) => {
                const layoutFile = path.join(routerRoot, layout.contextKey)
                const layoutExported = await runner.import(layoutFile)
                return runLoaderWithTracking(layout, layoutExported.loader)
              })

              // run page loader
              const pageLoaderPromise = runLoaderWithTracking(pageRoute, exported.loader)

              // wait for all loaders in parallel
              let layoutResults: Awaited<ReturnType<typeof runLoaderWithTracking>>[]
              ;[layoutResults, pageResult] = await Promise.all([
                Promise.all(layoutLoaderPromises),
                pageLoaderPromise,
              ])

              // build matches array (layouts + page)
              matches = [
                ...layoutResults.map((result) => ({
                  routeId: result.routeId,
                  pathname: loaderProps?.path || '/',
                  params: loaderProps?.params || {},
                  loaderData: result.loaderData,
                })),
                {
                  routeId: pageResult.routeId,
                  pathname: loaderProps?.path || '/',
                  params: loaderProps?.params || {},
                  loaderData: pageResult.loaderData,
                },
              ]

              // for backwards compat, loaderData is still the page's loader data
              loaderData = pageResult.loaderData
            }

            // biome-ignore lint/security/noGlobalEval: needed to set server env at runtime
            eval(`process.env.TAMAGUI_IS_SERVER = '1'`)

            const entry = await runner.import(virtualEntryId)

            const render = entry.default.render as (props: RenderAppProps) => any

            setServerContext({
              loaderData,
              loaderProps,
              matches,
            })

            // detect 404: not-found routes, missing page exports, or ssg dynamic routes with invalid slugs
            const isDynamicRoute = Object.keys(route.routeKeys || {}).length > 0

            // for ssg dynamic routes, check generateStaticParams to validate the slug
            let isMissingSsgSlug = false
            if (route.type === 'ssg' && isDynamicRoute && exported.generateStaticParams) {
              const staticParams = await exported.generateStaticParams({
                params: loaderProps?.params,
              })
              const currentParams = loaderProps?.params || {}
              isMissingSsgSlug = !staticParams.some((sp: Record<string, string>) =>
                Object.keys(sp).every((key) => sp[key] === currentParams[key])
              )
            }

            const isLoaderEnoent = !isSpaShell && pageResult?.isEnoent
            const is404 =
              route.isNotFound ||
              !getPageExport(exported) ||
              isMissingSsgSlug ||
              isLoaderEnoent

            // for routes with invalid slug (ssg or loader ENOENT), find and render the nearest +not-found page
            let notFoundRoutePath: string | null = null
            if (isMissingSsgSlug || isLoaderEnoent) {
              // find nearest +not-found by walking up the route's directory
              // strip leading ./ and file name to get directory
              const routeDir = route.file.replace(/^\.\//, '').replace(/\/[^/]+$/, '')
              let searchDir = routeDir
              while (true) {
                for (const ext of ['.tsx', '.ts', '.jsx', '.js']) {
                  const candidate = path.join(routerRoot, searchDir, `+not-found${ext}`)
                  try {
                    const notFoundExported = await runner.import(candidate)
                    if (notFoundExported?.default) {
                      notFoundRoutePath = searchDir
                        ? `/${searchDir}/+not-found`
                        : '/+not-found'
                      break
                    }
                  } catch {
                    // not found at this level
                  }
                }
                if (notFoundRoutePath || !searchDir) break
                const parent = searchDir.replace(/\/[^/]+$/, '')
                if (parent === searchDir) {
                  searchDir = ''
                } else {
                  searchDir = parent
                }
              }

              // if no +not-found page exists, return basic 404
              if (!notFoundRoutePath) {
                return new Response(
                  '<html><body><h1>404 - Not Found</h1></body></html>',
                  {
                    status: 404,
                    headers: { 'Content-Type': 'text/html' },
                  }
                )
              }
            }

            // for 404 with notFoundRoutePath, render the +not-found page at that path
            const renderPath = notFoundRoutePath || loaderProps?.path || '/'

            let html = await render({
              mode: isSpaShell
                ? 'spa-shell'
                : route.type === 'ssg'
                  ? 'ssg'
                  : route.type === 'ssr'
                    ? 'ssr'
                    : 'spa',
              loaderData,
              loaderProps,
              path: renderPath,
              preloads,
              matches,
            })

            if (is404) {
              // inject 404 marker for client-side not-found state awareness
              if (notFoundRoutePath) {
                const originalPath = loaderProps?.path || '/'
                const notFoundMarker = `<script>window.__one404={originalPath:${JSON.stringify(originalPath)},notFoundPath:${JSON.stringify(notFoundRoutePath)}}</script>`
                html = html.includes('</head>')
                  ? html.replace('</head>', `${notFoundMarker}</head>`)
                  : html.replace('<body', `${notFoundMarker}<body`)
              }
              return new Response(html, {
                status: 404,
                headers: { 'Content-Type': 'text/html' },
              })
            }

            if (ssgCacheKey) {
              ssgHtmlCache.set(ssgCacheKey, html)
            }

            return html
          } catch (err) {
            // allow throwing a response in a loader (e.g. redirect)
            if (isResponse(err)) {
              return err
            }

            console.error(
              `SSR error while loading file ${route.file} from URL ${url.href}\n`,
              err
            )
            const title = `Error rendering ${url.pathname} on server`
            const message = err instanceof Error ? err.message : `${err}`
            const stack = err instanceof Error ? err.stack || '' : ''

            const isDuplicateReactError =
              /at (useEffect|useState|useReducer|useContext|useLayoutEffect)\s*\(.*?react\.development\.js/g.test(
                stack
              )
            const subMessage = isDuplicateReactError
              ? `
            <h2>Duplicate React Error</h2>
            <p style="font-size: 18px; line-height: 24px; max-width: 850px;">Note: These types of errors happen during SSR because One needs all dependencies that use React to be optimized. Find the dependency on the line after the react.development.js line below to find the failing dependency. So long as that dependency has "react" as a sub-dependency, you can add it to your package.json and One will optimize it automatically. If it doesn't list it properly, you can fix this manually by changing your vite.config.ts One plugin to add "one({ deps: { depName: true })" so One optimizes depName.</p>
          `
              : ``

            console.error(`${title}\n ${message}\n\n${stack}\n`)

            return `
            <html>
              <body style="background: #000; color: #fff; padding: 5%; font-family: monospace; line-height: 2rem;">
                <h1 style="display: inline-flex; background: red; color: white; padding: 5px; margin: -5px;">${title}</h1>
                <h2>${message}</h2>
                ${subMessage}
                ${
                  stack
                    ? `<pre style="font-size: 15px; line-height: 24px; white-space: pre;">
                    ${stack}
                </pre>`
                    : ``
                }
              </body>
            </html>
          `
          } finally {
            resolveRender()
          }
        },

        async handleLoader({ route, url, loaderProps }) {
          const routeFile = path.join(routerRoot, route.file)

          // this will remove all loaders
          let transformedJS = (await server.transformRequest(routeFile))?.code
          if (!transformedJS) {
            throw new Error(`No transformed js returned`)
          }

          // the client tree-shake plugin replaces loader exports with stubs
          // like "export function loader()". if no stub exists, this route has
          // no loader - skip the SSR module import to avoid evaluating modules
          // with potentially SSR-incompatible deps (e.g. tamagui in SSR)
          if (!/export function loader\(\)/.test(transformedJS)) {
            return transformedJS
          }

          const exported = await runner.import(routeFile)

          // for ssg dynamic routes, check generateStaticParams to validate the slug
          const isDynamicRoute = Object.keys(route.routeKeys || {}).length > 0
          if (route.type === 'ssg' && isDynamicRoute && exported.generateStaticParams) {
            const staticParams = await exported.generateStaticParams({
              params: loaderProps?.params,
            })
            const currentParams = loaderProps?.params || {}
            const isValidSlug = staticParams.some((sp: Record<string, string>) =>
              Object.keys(sp).every((key) => sp[key] === currentParams[key])
            )
            if (!isValidSlug) {
              const nfPath = await findNearestNotFoundPath(route.file)
              return `export function loader(){return{__oneError:404,__oneErrorMessage:'Not Found',__oneNotFoundPath:${JSON.stringify(nfPath)}}}`
            }
          }

          // Track file dependencies from loader for hot reload
          let loaderData: any
          if (exported.loader) {
            try {
              const tracked = await trackLoaderDependencies(() =>
                exported.loader(loaderProps)
              )
              loaderData = tracked.result

              // if the loader returned a Response (e.g. redirect()), throw it
              // so it bubbles up through resolveResponse and can be transformed
              // into a JS redirect module for client-side navigation
              if (isResponse(loaderData)) {
                throw loaderData
              }

              // Register dependencies: map file path -> route paths that depend on it
              const routePath = loaderProps?.path || '/'
              for (const dep of tracked.dependencies) {
                // Resolve to absolute path for consistent lookup when file changes
                const absoluteDep = path.resolve(dep)
                setBoundedLoaderDep(absoluteDep, routePath)
                if (debugLoaderDeps) {
                  console.info(` ⓵  [loader-dep] watching: ${absoluteDep}`)
                }
              }
            } catch (err) {
              // re-throw Response errors (redirects)
              if (isResponse(err)) {
                throw err
              }
              // for file-not-found errors (e.g., missing MDX for non-existent slug),
              // return a 404 signal so the client navigates to +not-found
              if ((err as any)?.code === 'ENOENT') {
                const nfPath = await findNearestNotFoundPath(route.file)
                return `export function loader(){return{__oneError:404,__oneErrorMessage:'Not Found',__oneNotFoundPath:${JSON.stringify(nfPath)}}}`
              }
              throw err
            }
          }

          if (loaderData) {
            // add loader back in!
            transformedJS = replaceLoader({
              code: transformedJS,
              loaderData,
            })
          }

          const platform = url.searchParams.get('platform')

          if (platform === 'ios' || platform === 'android' || platform === 'native') {
            // Need to transpile to CommonJS for React Native

            const environment =
              server.environments[platform === 'native' ? 'ios' : platform || '']
            if (!environment) {
              throw new Error(
                `[handleLoader] No Vite environment found for platform '${platform}'`
              )
            }

            // [3] Just use a simple function to return the loader data for now.
            const nativeTransformedJS = `exports.loader = () => (${JSON.stringify(loaderData)});`

            return nativeTransformedJS
          }

          return transformedJS
        },

        async handleAPI({ route }) {
          return await runner.import(path.join(routerRoot, route.file))
        },

        async loadMiddleware(route) {
          return await runner.import(path.join(routerRoot, route.contextKey))
        },
      },
      { routerRoot, ignoredRouteFiles: options.router?.ignoredRouteFiles }
    )
  }

  function recreateRequestHandler(changedPath: string) {
    try {
      handleRequest = createRequestHandler()
      ssgHtmlCache.clear()
      needsCacheClear = true
    } catch (error) {
      console.warn(`[one] Failed to rebuild routes after ${changedPath} changed.`, error)
    }
  }

  return {
    name: `one-router-fs`,
    enforce: 'post',
    apply: 'serve',

    async config() {
      const setting = options.optimization?.autoEntriesScanning ?? 'flat'
      const routerRoot = normalizePath(getRouterRootFromOneOptions(options))

      if (setting === false) {
        return
      }

      if (handleRequest.manifest.pageRoutes) {
        const routesAndLayouts = [
          ...new Set(
            handleRequest.manifest.pageRoutes.flatMap((route) => {
              if (route.isNotFound) return []
              // sitemap
              if (!route.file) return []

              if (
                setting === 'flat' &&
                route.file.split('/').filter((x) => !x.startsWith('(')).length > 3
              ) {
                return []
              }

              // optimizeDeps.entries uses tinyglobby — needs forward-slash patterns
              return [
                path.posix.join(`./${routerRoot}`, route.file),
                ...(route.layouts?.flatMap((layout) => {
                  if (!layout.contextKey) return []
                  return [path.posix.join(`./${routerRoot}`, layout.contextKey)]
                }) || []),
              ]
            })
          ),
        ]

        return {
          optimizeDeps: {
            /**
             * This adds all our routes and layouts as entries which fixes initial load making
             * optimizeDeps be triggered which causes hard refreshes (also on initial navigations)
             *
             * see: https://vitejs.dev/config/dep-optimization-options.html#optimizedeps-entries
             * and: https://github.com/remix-run/remix/pull/9921
             */
            entries: routesAndLayouts,
          },
        }
      }
    },

    configureServer(serverIn) {
      server = serverIn

      // change this to .server to test using the indepedently scoped env
      runner = createServerModuleRunner(
        USE_SERVER_ENV ? server.environments.server : server.environments.ssr
      )

      const appDir = path.resolve(process.cwd(), getRouterRootFromOneOptions(options))

      // any watched file change means the SSR runner may be serving stale module
      // code — mark the cache dirty so the next render re-evaluates once (set
      // immediately/undebounced so it can't race ahead of a render).
      //
      // but only for files the SSR runner has ACTUALLY evaluated. the watcher
      // fires for EVERY file event under the project root — including build-tool
      // scratch files (e.g. *.bun-build temp artifacts), freshly created
      // unrelated files, and other tooling's churn. in a busy monorepo that
      // churn is near-constant, and marking the cache dirty on it forces a full
      // re-evaluation of the SSR module tree on the very next render (a new
      // AsyncFunction per module) — exactly the unbounded heap leak the
      // needsCacheClear comment above exists to prevent (→ 5-8GB RSS / OOM).
      //
      // `runner.evaluatedModules` is the precise set clearCache() would re-evaluate,
      // so a change outside it can never make the cache stale. it correctly
      // includes both route files (loaded via runner.import) and shared source
      // modules — unlike server.environments.ssr.moduleGraph, which misses
      // runner-imported route files. (route-file adds/removes are still handled
      // separately below via recreateRequestHandler, so a brand-new route is
      // never missed.)
      server.watcher.on('all', (_event, file) => {
        if (file && runner?.evaluatedModules) {
          const mods =
            runner.evaluatedModules.getModulesByFile(file) ||
            runner.evaluatedModules.getModulesByFile(normalizePath(file))
          if (!mods || mods.size === 0) return
        }
        needsCacheClear = true
      })

      // on change ./app stuff lets reload this to pick up any route changes
      const fileWatcherChangeListener = debounce((type: string, changedPath: string) => {
        if (
          isRouteFileWatchEvent({
            event: type,
            filePath: changedPath,
            routerRoot: appDir,
          })
        ) {
          recreateRequestHandler(changedPath)
        }
      }, 100)

      server.watcher.addListener('all', fileWatcherChangeListener)

      // Watch for changes to loader dependencies (files read via fs in loaders)
      const loaderDepChangeListener = debounce((changedPath: string) => {
        const absolutePath = path.resolve(changedPath)
        const routePaths = loaderFileDependencies.get(absolutePath)
        if (routePaths && routePaths.size > 0) {
          if (debugLoaderDeps) {
            console.info(
              ` ⓵  [loader-dep] changed: ${absolutePath}, triggering loader refetch for routes:`,
              [...routePaths]
            )
          }
          // Send custom HMR event with affected route paths for hot reload (no full page reload)
          server.hot.send({
            type: 'custom',
            event: 'one:loader-data-update',
            data: { routePaths: [...routePaths] },
          })
          ssgHtmlCache.clear()
        }
      }, 100)

      server.watcher.on('change', loaderDepChangeListener)

      // Instead of adding the middleware here, we return a function that Vite
      // will call after adding its own middlewares. We want our code to run after
      // Vite's transform middleware so that we can focus on handling the requests
      // we're interested in.
      return () => {
        // packager status fallback — runs after one's routing so user-defined
        // /status routes, +api handlers, and custom middleware take priority.
        // only fires if nothing else handled the request.
        server.middlewares.use((req, res, next) => {
          if (req.url === '/status' || req.url?.startsWith('/status?')) {
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end('packager-status:running')
            return
          }
          next()
        })

        server.middlewares.use(async (req, res, next) => {
          // prevent browsers (safari) from caching stale html/js in dev
          res.setHeader('Cache-Control', 'no-store')

          try {
            const redirects = options.web?.redirects
            if (redirects) {
              const url = new URL(req.url || '', `http://${req.headers.host}`)
              for (const redirect of redirects) {
                const regexStr = `^${redirect.source.replace(/:\w+/g, '([^/]+)')}$`
                const match = url.pathname.match(new RegExp(regexStr))

                if (match) {
                  let destination = redirect.destination
                  const params = redirect.source.match(/:\w+/g)

                  if (params) {
                    params.forEach((param, index) => {
                      destination = destination.replace(param, match[index + 1] || '')
                    })
                  }

                  if (debugRouter) {
                    console.info(`[one] ↪ redirect ${url.pathname} → ${destination}`)
                  }

                  res.writeHead(redirect.permanent ? 301 : 302, {
                    Location: destination,
                  })
                  res.end()
                  return
                }
              }
            }

            const reply = await handleRequest.handler(
              convertIncomingMessageToRequest(req)
            )

            if (!reply) {
              return next()
            }

            if (typeof reply !== 'string' && isResponse(reply)) {
              if (debugRouter) {
                const headers: Record<string, string> = {}
                reply.headers.forEach((v, k) => {
                  headers[k] = v
                })
                console.info(`[one] 📤 response ${reply.status}`, headers)
              }

              reply.headers.forEach((value, key) => {
                if (key === 'set-cookie') {
                  // for some reason it wasnt doing working without this?
                  const cookies = value.split(', ')
                  for (const cookie of cookies) {
                    res.appendHeader('Set-Cookie', cookie)
                  }
                } else {
                  res.setHeader(key, value)
                }
              })

              if (isStatusRedirect(reply.status)) {
                const location = `${reply.headers.get('location') || ''}`
                if (debugRouter) {
                  console.info(`[one] ↪ response redirect → ${location}`)
                }
                if (location) {
                  res.writeHead(reply.status, {
                    Location: location,
                  })
                  res.end()
                  return
                }
                console.error(`No location provided to redirected status reply`, reply)
              }

              res.statusCode = reply.status
              res.statusMessage = reply.statusText

              if (reply.body) {
                if (reply.body.locked) {
                  console.warn(`Body is locked??`, req.url)
                  res.end()
                  return
                }
                try {
                  Readable.fromWeb(reply.body as any).pipe(res)
                } catch (err) {
                  console.warn('Error piping reply body to response:', err)
                  res.end()
                }
                return
              }

              res.end()
              return
            }

            if (reply && typeof reply === 'object') {
              res.setHeader('Content-Type', 'application/json')
              res.write(JSON.stringify(reply))
              res.end()
              return
            }

            res.write(reply)
            res.end()
            return
          } catch (error) {
            console.error(`[one] routing error ${req.url}: ${error}`)
            // Forward the error to Vite
            next(error)
          }

          // We're not calling `next` because our handler will always be
          // the last one in the chain. If it didn't send a response, we
          // will treat it as an error since there will be no one else to
          // handle it in production.
          console.warn(`SSR handler didn't send a response for url: ${req.url}`)
        })
      }
    },
  } satisfies Plugin
}

const convertIncomingMessageToRequest = (req: Connect.IncomingMessage): Request => {
  if (!req.originalUrl) {
    throw new Error(`Can't convert: originalUrl is missing`)
  }

  const urlBase = `http://${req.headers.host}`
  const urlString = req.originalUrl
  const url = new URL(urlString, urlBase)

  const headers = new Headers()
  for (const key in req.headers) {
    if (req.headers[key]) {
      headers.append(key, req.headers[key] as string)
    }
  }

  const hasBody = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')
  const body = hasBody ? Readable.toWeb(req) : null

  return new Request(url, {
    method: req.method,
    headers,
    body,
    // Required for streaming bodies in Node's experimental fetch:
    duplex: 'half',
  } as RequestInit & { duplex: 'half' })
}
