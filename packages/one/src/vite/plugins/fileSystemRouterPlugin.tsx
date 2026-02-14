import path from 'node:path'
import { Readable } from 'node:stream'
import { debounce } from 'perfect-debounce'
import colors from 'picocolors'
import type { Connect, Plugin, ViteDevServer } from 'vite'
import { createServerModuleRunner } from 'vite'
import type { ModuleRunner } from 'vite/module-runner'
import { getSpaHeaderElements, VIRTUAL_SSR_CSS_HREF } from '../../constants'
import { createHandleRequest } from '../../createHandleRequest'
import type { RouteNode } from '../../router/Route' // used for type in runLoaderWithTracking
import type { RenderAppProps } from '../../types'
import { getPageExport } from '../../utils/getPageExport'
import { getRouterRootFromOneOptions } from '../../utils/getRouterRootFromOneOptions'
import { isResponse } from '../../utils/isResponse'
import { isStatusRedirect } from '../../utils/isStatus'
import { promiseWithResolvers } from '../../utils/promiseWithResolvers'
import { trackLoaderDependencies } from '../../utils/trackLoaderDependencies'
import { LoaderDataCache } from '../../vite/constants'
import { replaceLoader } from '../../vite/replaceLoader'
import type { One } from '../../vite/types'
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

  // Track file dependencies from loaders for hot reload
  // Maps file path -> set of route paths that depend on it
  const loaderFileDependencies = new Map<string, Set<string>>()

  let handleRequest = createRequestHandler()
  // handle only one at a time in dev mode to avoid "Detected multiple renderers concurrently" errors
  let renderPromise: Promise<void> | null = null

  function createRequestHandler() {
    const routerRoot = getRouterRootFromOneOptions(options)
    return createHandleRequest(
      {
        async handlePage({ route, url, loaderProps }) {
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

          const { promise, resolve: resolveRender } = promiseWithResolvers<void>()
          renderPromise = promise

          try {
            const routeFile = path.join(routerRoot, route.file)
            runner.clearCache()

            globalThis['__vxrnresetState']?.()

            const exported = routeFile === '' ? {} : await runner.import(routeFile)

            // helper to run a loader and track dependencies
            async function runLoaderWithTracking(
              routeNode: RouteNode | { contextKey: string; file?: string },
              loaderFn: ((props: any) => any) | undefined
            ): Promise<{ loaderData: any; routeId: string }> {
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
                  if (!loaderFileDependencies.has(absoluteDep)) {
                    loaderFileDependencies.set(absoluteDep, new Set())
                    server?.watcher.add(absoluteDep)
                    if (debugLoaderDeps) {
                      console.info(` ⓵  [loader-dep] watching: ${absoluteDep}`)
                    }
                  }
                  loaderFileDependencies.get(absoluteDep)!.add(routePath)
                }

                return { loaderData: tracked.result, routeId }
              } catch (err) {
                // if a loader throws a Response (redirect), re-throw it
                if (isResponse(err)) {
                  throw err
                }
                console.error(`[one] Error running loader for ${routeId}:`, err)
                return { loaderData: undefined, routeId }
              }
            }

            let loaderData: any
            let matches: One.RouteMatch[]

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
              const [layoutResults, pageResult] = await Promise.all([
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

            LoaderDataCache[route.file] = loaderData

            const is404 = route.isNotFound || !getPageExport(exported)

            const html = await render({
              mode: isSpaShell
                ? 'spa-shell'
                : route.type === 'ssg'
                  ? 'ssg'
                  : route.type === 'ssr'
                    ? 'ssr'
                    : 'spa',
              loaderData,
              loaderProps,
              path: loaderProps?.path || '/',
              preloads,
              matches,
            })

            if (is404) {
              return new Response(html, {
                status: 404,
                headers: { 'Content-Type': 'text/html' },
              })
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

        async handleLoader({ request, route, url, loaderProps }) {
          const routeFile = path.join(routerRoot, route.file)

          // this will remove all loaders
          let transformedJS = (await server.transformRequest(routeFile))?.code
          if (!transformedJS) {
            throw new Error(`No transformed js returned`)
          }

          const exported = await runner.import(routeFile)

          // Track file dependencies from loader for hot reload
          let loaderData: any
          if (exported.loader) {
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
              if (!loaderFileDependencies.has(absoluteDep)) {
                loaderFileDependencies.set(absoluteDep, new Set())
                server?.watcher.add(absoluteDep)
                if (debugLoaderDeps) {
                  console.info(` ⓵  [loader-dep] watching: ${absoluteDep}`)
                }
              }
              loaderFileDependencies.get(absoluteDep)!.add(routePath)
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

          if (platform === 'ios' || platform === 'android') {
            // Need to transpile to CommonJS for React Native

            const environment = server.environments[platform || '']
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
      { routerRoot }
    )
  }

  return {
    name: `one-router-fs`,
    enforce: 'post',
    apply: 'serve',

    async config(userConfig) {
      const setting = options.optimization?.autoEntriesScanning ?? 'flat'

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

              return [
                path.join('./app', route.file),
                ...(route.layouts?.flatMap((layout) => {
                  if (!layout.contextKey) return []
                  return [path.join('./app', layout.contextKey)]
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
      // if (USE_SERVER_ENV) {
      //   return {
      //     appType: 'custom',
      //     environments: {
      //       server: {
      //         resolve: {
      //           dedupe: optimizeDeps.include,
      //           external: [],
      //           noExternal: optimizeDeps.include,
      //           conditions: ['vxrn-web'],
      //           alias: {
      //             react: '@vxrn/vendor/react-19',
      //             'react-dom': '@vxrn/vendor/react-dom-19',
      //           },
      //         },
      //         // webCompatible: true,
      //         nodeCompatible: true,
      //         dev: {
      //           optimizeDeps,
      //           createEnvironment(name, config) {
      //             const worker = new Worker(path.join(import.meta.dirname, 'server.js'))
      //             // const hot = new
      //             return new DevEnvironment(name, config, {
      //               hot: false,
      //               runner: {
      //                 transport: new RemoteEnvironmentTransport({
      //                   send: (data) => worker.postMessage(data),
      //                   onMessage: (listener) => worker.on('message', listener),
      //                 }),
      //               },
      //             })
      //           },
      //         },
      //       },
      //     },
      //   }
      // }
    },

    configureServer(serverIn) {
      server = serverIn

      // change this to .server to test using the indepedently scoped env
      runner = createServerModuleRunner(
        USE_SERVER_ENV ? server.environments.server : server.environments.ssr
      )

      const appDir = path.join(process.cwd(), getRouterRootFromOneOptions(options))

      // on change ./app stuff lets reload this to pick up any route changes
      const fileWatcherChangeListener = debounce(
        async (type: string, changedPath: string) => {
          if (type === 'add' || type === 'delete') {
            // resolve to absolute path since watcher may emit relative paths
            const absolutePath = path.resolve(changedPath)
            if (absolutePath.startsWith(appDir)) {
              handleRequest = createRequestHandler()
            }
          }
        },
        100
      )

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
        }
      }, 100)

      server.watcher.on('change', loaderDepChangeListener)

      // Instead of adding the middleware here, we return a function that Vite
      // will call after adding its own middlewares. We want our code to run after
      // Vite's transform middleware so that we can focus on handling the requests
      // we're interested in.
      return () => {
        server.middlewares.use(async (req, res, next) => {
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
                  res.write(``)
                  res.end()
                  return
                }
              }

              if (reply.body) {
                if (reply.body.locked) {
                  console.warn(`Body is locked??`, req.url)
                  res.end()
                  return
                }
                try {
                  // Use Node >=18's fromWeb to pipe the web-stream directly:
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
