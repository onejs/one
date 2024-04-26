import * as Glob from 'glob'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Connect, Plugin, ViteDevServer } from 'vite'
import { createRoutesManifest, type ExpoRoutesManifestV1 } from '../routes-manifest'
import { getHtml } from './getHtml'

const { sync: globSync } = (Glob['default'] || Glob) as typeof Glob

type Options = {
  root: string
  shouldIgnore?: (req: Connect.IncomingMessage) => boolean
  disableSSR?: boolean
}

export function createFileSystemRouter(options: Options): Plugin {
  const { root, shouldIgnore } = options

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

            let pathname = url.pathname

            const isClientRequestingNewRoute = url.pathname.startsWith('/_vxrn/')

            if (isClientRequestingNewRoute) {
              const search = new URLSearchParams(url.search)
              const realPathName = search.get('pathname') || '/'
              // use the param
              url = new URL(realPathName, urlBase)
              console.log('LOAINF', url)

              // TODO not handleSSR because we need to return just the JS + loaded data inline, not
              // the entire html response
            }

            const ssrResponse = await handleSSR({
              options,
              server,
              manifest,
              url,
            })

            console.info(`ssrResponse`, ssrResponse)

            if (ssrResponse) {
              res.write(ssrResponse)
              res.end()
              return
            }

            // We're not calling `next` because our handler will always be
            // the last one in the chain. If it didn't send a response, we
            // will treat it as an error since there will be no one else to
            // handle it in production.
            if (!res.writableEnded) {
              next(new Error(`SSR handler didn't send a response for url: ${pathname}`))
            }
          } catch (error) {
            // Forward the error to Vite
            next(error)
          }
        })
      }
    },
  }
}

async function handleAPIRoutes(
  options: Options,
  server: ViteDevServer,
  req: Connect.IncomingMessage,
  apiRoutesMap: Object
) {
  const matched = apiRoutesMap[req.originalUrl!]
  if (matched) {
    const loaded = await server.ssrLoadModule(join(options.root, matched.file))
    if (loaded) {
      const requestType = req.method || 'GET'
      const method = loaded[requestType]
      if (method) {
        return await method(req)
      }
    }
  }
}

// TODO not needed anymore i think
// ensure only one at a time
// let currentSSRBuild: Promise<void> | null = null

async function handleSSR({
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
  if (pathname === '/__vxrnhmr') return
  if (pathname.startsWith('/@')) return
  // if (currentSSRBuild) await currentSSRBuild

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

  let resolve = () => {}

  for (const route of manifest.htmlRoutes) {
    // TODO performance
    if (!new RegExp(route.namedRegex).test(pathname)) {
      continue
    }

    const params = getParams(url, route)
    const routeFile = join(root, route.file)

    // currentSSRBuild = new Promise((res) => {
    //   resolve = res
    // })

    try {
      console.info(`SSR load`, routeFile)

      const exported = await server.ssrLoadModule(routeFile, {
        fixStacktrace: true,
      })

      console.info(`Loaded`)

      const loaderData = await exported.loader?.({ path: pathname, params })

      if (loaderData) {
        console.info(` [vxrn] loader(): ${JSON.stringify(loaderData)}`)
      }

      const entryServer = `${root}/../src/entry-server.tsx`

      // TODO move
      process.env.TAMAGUI_IS_SERVER = '1'

      const { render } = await server.ssrLoadModule(entryServer)

      globalThis['__vxrnLoaderData__'] = loaderData

      const { appHtml, headHtml } = await render({
        path: pathname,
      })

      console.info(`returning appHtml`, appHtml)

      return getHtml({
        appHtml,
        headHtml,
        loaderData,
        template,
      })
    } catch (err) {
      const message = err instanceof Error ? `${err.message}:\n${err.stack}` : `${err}`
      console.error(`Error in SSR: ${message}`)
      return template
    } finally {
      // currentSSRBuild = null
      resolve()
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
