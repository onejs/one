import { join } from 'node:path'
import { Readable } from 'node:stream'
import { debounce } from 'perfect-debounce'
import type { Connect, Plugin, ViteDevServer } from 'vite'
import { createServerModuleRunner } from 'vite'
import type { ModuleRunner } from 'vite/module-runner'
import { getSpaHeaderElements } from '../../constants'
import { createHandleRequest } from '../../createHandleRequest'
import type { RenderAppProps } from '../../types'
import { getRouterRootFromOneOptions } from '../../utils/getRouterRootFromOneOptions'
import { isResponse } from '../../utils/isResponse'
import { isStatusRedirect } from '../../utils/isStatus'
import { promiseWithResolvers } from '../../utils/promiseWithResolvers'
import { LoaderDataCache } from '../../vite/constants'
import { replaceLoader } from '../../vite/replaceLoader'
import type { One } from '../../vite/types'
import { setServerContext } from '../one-server-only'
import { virtalEntryIdClient, virtualEntryId } from './virtualEntryConstants'

// server needs better dep optimization
const USE_SERVER_ENV = false //!!process.env.USE_SERVER_ENV

export function createFileSystemRouterPlugin(options: One.PluginOptions): Plugin {
  const preloads = ['/@vite/client', virtalEntryIdClient]

  let runner: ModuleRunner
  let server: ViteDevServer

  let handleRequest = createRequestHandler()
  // handle only one at a time in dev mode to avoid "Detected multiple renderers concurrently" errors
  let renderPromise: Promise<void> | null = null

  function createRequestHandler() {
    const routerRoot = getRouterRootFromOneOptions(options)
    return createHandleRequest(
      {
        async handlePage({ route, url, loaderProps }) {
          console.info(
            ` ⓵  [${route.type}] ${url} resolved to ${
              route.isNotFound ? '‼️ 404 not found' : `app/${route.file.slice(2)}`
            }`
          )

          if (route.type === 'spa') {
            // render just the layouts? route.layouts
            return `<html><head>
            ${getSpaHeaderElements({ serverContext: { mode: 'spa' } })}
            <script type="module">
              import { injectIntoGlobalHook } from "/@react-refresh";
              injectIntoGlobalHook(window);
              window.$RefreshReg$ = () => {};
              window.$RefreshSig$ = () => (type) => type;
            </script>
            <script type="module" src="/@vite/client" async=""></script>
            <script type="module" src="/@id/__x00__virtual:one-entry" async=""></script>
          </head></html>`
          }

          if (renderPromise) {
            await renderPromise
          }

          const { promise, resolve } = promiseWithResolvers<void>()
          renderPromise = promise

          try {
            const routeFile = join(routerRoot, route.file)
            runner.clearCache()

            globalThis['__vxrnresetState']?.()

            const exported = routeFile === '' ? {} : await runner.import(routeFile)
            const loaderData = await exported.loader?.(loaderProps)

            // biome-ignore lint/security/noGlobalEval: needed to set server env at runtime
            eval(`process.env.TAMAGUI_IS_SERVER = '1'`)

            const entry = await runner.import(virtualEntryId)

            const render = entry.default.render as (props: RenderAppProps) => any

            setServerContext({
              loaderData,
              loaderProps,
            })

            LoaderDataCache[route.file] = loaderData

            const is404 = route.isNotFound || !exported.default

            const html = await render({
              mode: route.type === 'ssg' ? 'ssg' : route.type === 'ssr' ? 'ssr' : 'spa',
              loaderData,
              loaderProps,
              path: loaderProps?.path || '/',
              preloads,
            })

            if (is404) {
              return new Response(html, {
                status: 404,
                headers: { 'Content-Type': 'text/html' },
              })
            }

            return html
          } catch (err) {
            console.error(`SSR error while loading file ${route.file} from URL ${url.href}\n`, err)
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
            resolve()
          }
        },

        async handleLoader({ request, route, url, loaderProps }) {
          const routeFile = join(routerRoot, route.file)

          // this will remove all loaders
          let transformedJS = (await server.transformRequest(routeFile))?.code
          if (!transformedJS) {
            throw new Error(`No transformed js returned`)
          }

          // Force re-import to get fresh loader execution by invalidating the module
          const timestamp = url.searchParams.get('_t')
          const random = url.searchParams.get('_r')
          const cacheKey = timestamp || random ? `${routeFile}?t=${timestamp}&r=${random}` : routeFile

          // Invalidate the module cache if we have cache-busting params
          if (timestamp || random) {
            // @ts-ignore - moduleCache exists but not in types
            runner.moduleCache?.deleteByModuleId(routeFile)
          }

          const exported = await runner.import(cacheKey)
          const loaderData = await exported.loader?.(loaderProps)

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
              throw new Error(`[handleLoader] No Vite environment found for platform '${platform}'`)
            }

            // [3] Just use a simple function to return the loader data for now.
            const nativeTransformedJS = `exports.loader = () => (${JSON.stringify(loaderData)});`

            return nativeTransformedJS
          }

          return transformedJS
        },

        async handleAPI({ route }) {
          return await runner.import(join(routerRoot, route.file))
        },

        async loadMiddleware(route) {
          return await runner.import(join(routerRoot, route.contextKey))
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
                join('./app', route.file),
                ...(route.layouts?.flatMap((layout) => {
                  if (!layout.contextKey) return []
                  return [join('./app', layout.contextKey)]
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
      //             const worker = new Worker(join(import.meta.dirname, 'server.js'))
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

      const appDir = join(process.cwd(), getRouterRootFromOneOptions(options))

      // on change ./app stuff lets reload this to pick up any route changes
      const fileWatcherChangeListener = debounce(async (type: string, path: string) => {
        if (type === 'add' || type === 'delete') {
          if (path.startsWith(appDir)) {
            handleRequest = createRequestHandler()
          }
        }
      }, 100)

      server.watcher.addListener('all', fileWatcherChangeListener)

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

                  console.warn(` [one] redirecting via redirect: ${destination}`)

                  res.writeHead(redirect.permanent ? 301 : 302, { Location: destination })
                  res.end()
                  return
                }
              }
            }

            const reply = await handleRequest.handler(await convertIncomingMessageToRequest(req))

            if (!reply) {
              return next()
            }

            if (typeof reply !== 'string' && isResponse(reply)) {
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
                console.info(` ↦ Redirect ${location}`)
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

              let outString = ''

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
