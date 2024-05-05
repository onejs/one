import * as Glob from 'glob'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Connect, Plugin, ViteDevServer } from 'vite'
import { createRoutesManifest, type ExpoRoutesManifestV1 } from '../routes-manifest'
import { LoaderDataCache } from './constants'
import { getHtml } from './getHtml'
import { asyncHeadersCache, mergeHeaders, requestAsyncLocalStore } from './headers'
import { loadEnv } from './loadEnv'

const { sync: globSync } = (Glob['default'] || Glob) as typeof Glob

export type Options = {
  root: string
  shouldIgnore?: (req: Connect.IncomingMessage) => boolean
  disableSSR?: boolean
}

export function createFileSystemRouter(options: Options): Plugin {
  const { root, shouldIgnore } = options

  // TODO need a higher level package
  void loadEnv(process.cwd()).then(() => {
    // console.log('loading env', process.env.POSTMARK_SERVER_TOKEN)
  })

  return {
    name: `router-fs`,
    enforce: 'post',
    apply: 'serve',

    configureServer(server) {
      const routePaths = getRoutePaths(root)
      const manifest = createRoutesManifest(routePaths, {
        platform: 'web',
      })

      // Instead of adding the middleware here, we return a function that Vite
      // will call after adding its own middlewares. We want our code to run after
      // Vite's transform middleware so that we can focus on handling the requests
      // we're interested in.

      return () => {
        if (!manifest) {
          throw new Error(`No routes manifest`)
        }

        const apiRoutesMap = manifest.apiRoutes.reduce((acc, cur) => {
          acc[cur.page] = cur
          return acc
        }, {})

        // its really common for people to hit refresh a couple times even on accident
        // sending two ssr requests at once and causing slowdown.
        // use this to avoid
        const activeRequests = {}

        server.middlewares.use(async (req, res, next) => {
          try {
            const urlString = req.originalUrl || ''
            if (
              !urlString ||
              req.method !== 'GET' ||
              urlString === '/__vxrnhmr' ||
              urlString.startsWith('/@') ||
              shouldIgnore?.(req)
            ) {
              next()
              return
            }

            const urlBase = `http://${req.headers.host}`
            let url = new URL(urlString, urlBase)

            const apiResponse = await handleAPIRoutes(options, server, req, apiRoutesMap)
            if (apiResponse) {
              const isPlainResponse = !apiResponse || typeof apiResponse === 'string'
              if (!isPlainResponse) {
                res.setHeader('Content-Type', 'application/json')
              }
              res.write(isPlainResponse ? apiResponse : JSON.stringify(apiResponse))
              res.end()
              return
            }

            if (process.env.NODE_ENV === 'development' && url.search.includes('vxrnDisableSSR')) {
              options.disableSSR = true
            }

            const isClientRequestingNewRoute = url.pathname.startsWith('/_vxrn/')
            if (isClientRequestingNewRoute) {
              const search = new URLSearchParams(url.search)
              const realPathName = search.get('pathname') || '/'
              url = new URL(realPathName, urlBase)
              const jsSSRResponse = await handleSSRJS({
                options,
                server,
                manifest,
                url,
              })
              res.setHeader('Content-Type', 'text/javascript')
              res.write(jsSSRResponse)
              res.end()
              return
            }

            if (activeRequests[urlString]) {
              const ssrResponse = await activeRequests[urlString]
              res.write(ssrResponse)
              res.end()
              return
            }

            let resolve
            let reject
            activeRequests[urlString] = new Promise((res, rej) => {
              resolve = res
              reject = rej
            })

            try {
              const ssrResponse = await handleSSRHTML({
                options,
                server,
                manifest,
                url,
              })

              resolve(ssrResponse)

              if (ssrResponse) {
                res.write(ssrResponse)
                res.end()
                return
              }
            } catch (err) {
              reject(err)
              throw err
            } finally {
              delete activeRequests[urlString]
            }

            // We're not calling `next` because our handler will always be
            // the last one in the chain. If it didn't send a response, we
            // will treat it as an error since there will be no one else to
            // handle it in production.
            if (!res.writableEnded) {
              console.warn(`SSR handler didn't send a response for url: ${url.pathname}`)
              next()
              // next(new Error(`SSR handler didn't send a response for url: ${url.pathname}`))
            }
          } catch (error) {
            // Forward the error to Vite
            next(error)
          }
        })
      }
    },
  } satisfies Plugin
}

// TODO move

async function handleAPIRoutes(
  options: Options,
  server: ViteDevServer,
  req: Connect.IncomingMessage,
  apiRoutesMap: Object
) {
  const matched = apiRoutesMap[req.originalUrl!]
  if (!matched) return
  const loaded = await server.ssrLoadModule(join(options.root, matched.file))
  if (!loaded) return
  const requestType = req.method || 'GET'
  const handler = loaded[requestType] || loaded.default
  if (!handler) return
  return new Promise((res) => {
    const id = {}
    requestAsyncLocalStore.run(id, async () => {
      try {
        let response = await handler(await convertIncomingMessageToRequest(req))
        const asyncHeaders = asyncHeadersCache.get(id)
        if (asyncHeaders) {
          if (response instanceof Response) {
            mergeHeaders(response.headers, asyncHeaders)
          } else {
            response = new Response(response, { headers: asyncHeaders })
          }
        }
        res(response)
      } catch (err) {
        // allow throwing a response
        if (err instanceof Response) {
          res(err)
        } else {
          throw err
        }
      }
    })
  })
}

async function handleSSRJS({
  options,
  server,
  manifest,
  url,
}: {
  server: ViteDevServer
  url: URL
  manifest: ExpoRoutesManifestV1<string>
  options: Options
}) {
  const { pathname } = url
  const { root, disableSSR } = options

  // TODO we can find this without needing to match.
  for (const route of manifest.htmlRoutes) {
    // TODO performance
    if (!new RegExp(route.namedRegex).test(pathname)) {
      continue
    }

    const params = getParams(url, route)
    const routeFile = join(root, route.file)

    // this will remove all loaders
    let transformedJS = (await server.transformRequest(routeFile))?.code
    if (!transformedJS) {
      throw new Error(`No transformed js returned`)
    }

    if (disableSSR) {
      return transformedJS
    }

    const exported = await server.ssrLoadModule(routeFile, {
      fixStacktrace: true,
    })
    const loaderData = await exported.loader?.({ path: pathname, params })

    if (loaderData) {
      // add loader back in!
      transformedJS = transformedJS.replace(
        /function\s+loader\(\)\s+{\s+return \[\]\[0\];?\s+}/gm,
        `function loader(){ return ${JSON.stringify(loaderData)} }`
      )
    }

    return transformedJS
  }
}

async function handleSSRHTML({
  options,
  server,
  manifest,
  url,
}: {
  server: ViteDevServer
  url: URL
  manifest: ExpoRoutesManifestV1<string>
  options: Options
}) {
  const { pathname } = url
  const { root, disableSSR } = options

  const indexHtml = await readFile('./index.html', 'utf-8')

  const template = await server.transformIndexHtml(pathname, indexHtml)

  if (
    disableSSR ||
    // TODO search not pathname
    (process.env.NODE_ENV === 'development' && pathname.includes('vxrnDisableSSR'))
  ) {
    return indexHtml
  }

  for (const route of manifest.htmlRoutes) {
    // TODO performance
    if (!new RegExp(route.namedRegex).test(pathname)) {
      continue
    }

    const params = getParams(url, route)
    const routeFile = join(root, route.file)

    try {
      console.info(`SSR load`, routeFile)

      const exported = await server.ssrLoadModule(routeFile, {
        fixStacktrace: true,
      })

      const loaderData = await exported.loader?.({ path: pathname, params })
      const entryServer = `${root}/../src/entry-server.tsx`

      // TODO move to tamagui plugin, also esbuild was getting mad
      eval(`process.env.TAMAGUI_IS_SERVER = '1'`)

      const { render } = await server.ssrLoadModule(entryServer)

      globalThis['__vxrnLoaderData__'] = loaderData
      LoaderDataCache[route.file] = loaderData

      const { appHtml, headHtml } = await render({
        path: pathname,
      })

      return getHtml({
        appHtml,
        headHtml,
        loaderData,
        template,
      })
    } catch (err) {
      console.error(`Error rendering ${pathname} on server:`)
      console.error(err)
      return template
    }
  }
}

function getParams(url: URL, config: any) {
  const params: Record<string, string> = {}
  const match = new RegExp(config.namedRegex).exec(url.pathname)
  if (match?.groups) {
    for (const [key, value] of Object.entries(match.groups)) {
      const namedKey = config.routeKeys[key]
      params[namedKey] = value as string
    }
  }
  return params
}

// Used to emulate a context module, but way faster. TODO: May need to adjust the extensions to stay in sync with Metro.
function getRoutePaths(cwd: string) {
  return globSync('**/*.@(ts|tsx|js|jsx)', {
    cwd,
  }).map((p) => './' + normalizePaths(p))
}

function normalizePaths(p: string) {
  return p.replace(/\\/g, '/')
}

const convertIncomingMessageToRequest = async (req: Connect.IncomingMessage): Promise<Request> => {
  if (!req.originalUrl) {
    throw new Error(`Can't convert`)
  }
  const headers = new Headers()
  for (const key in req.headers) {
    if (req.headers[key]) headers.append(key, req.headers[key] as string)
  }
  return new Request(req.originalUrl, {
    method: req.method,
    body: req.method === 'POST' ? await readStream(req) : null,
    headers,
  })
}

function readStream(stream: Connect.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    stream.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}
