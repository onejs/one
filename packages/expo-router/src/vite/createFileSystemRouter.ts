import { sync as globSync } from 'glob'
import { readFile, rm } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { Connect, Plugin, ViteDevServer } from 'vite'
import { type ExpoRoutesManifestV1, createRoutesManifest } from '../routes-manifest'

type Options = {
  root: string
  routesDir: string
  shouldIgnore?: (req: Connect.IncomingMessage) => boolean
}

export function createFileSystemRouter(options: Options): Plugin {
  const { root, routesDir, shouldIgnore } = options

  return {
    name: `router-fs`,
    enforce: 'post',
    apply: 'serve',

    configureServer(server) {
      // Instead of adding the middleware here, we return a function that Vite
      // will call after adding its own middlewares. We want our code to run after
      // Vite's transform middleware so that we can focus on handling the requests
      // we're interested in.

      return () => {
        const routePaths = getRoutePaths(routesDir)
        const manifest = createRoutesManifest(routePaths)

        if (!manifest) {
          throw new Error(`No routes manifest`)
        }

        const apiRoutesMap = manifest.apiRoutes.reduce((acc, cur) => {
          acc[cur.page] = cur
          return acc
        }, {})

        server.middlewares.use(async (req, res, next) => {
          try {
            if (!req.url || req.originalUrl === '/__vxrnhmr' || extname(req.url) !== '') {
              next()
              return
            }
            // if (shouldIgnore?.(req)) return

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

            const ssrResponse = await handleSSR(options, server, req, manifest)
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
              next(new Error(`SSR handler didn't send a response for url: ${req.originalUrl}`))
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
    const loaded = await server.ssrLoadModule(join(options.routesDir, matched.file))
    if (loaded) {
      const requestType = req.method || 'GET'
      const method = loaded[requestType]
      if (method) {
        return await method(req)
      }
    }
  }
}

// ensure only one at a time
let currentSSRBuild: Promise<void> | null = null

async function handleSSR(
  { routesDir, root }: Options,
  server: ViteDevServer,
  req: Connect.IncomingMessage,
  manifest: ExpoRoutesManifestV1<string>
) {
  if (!req.url) return
  if (req.url.startsWith('/@')) return
  if (req.url === '/__vxrnhmr') return
  if (req.method !== 'GET') return
  if (currentSSRBuild) await currentSSRBuild

  const pathOg = req.originalUrl || ''

  if (extname(pathOg) !== '') return

  const url = new URL(pathOg, `http://${req.headers.host}`)
  const path = url.pathname // sanitized

  let resolve = () => {}

  for (const route of manifest.htmlRoutes) {
    // TODO performance
    if (!new RegExp(route.namedRegex).test(path)) {
      continue
    }

    const params = getParams(url, route)
    const routeFile = join(routesDir, route.file)

    currentSSRBuild = new Promise((res) => {
      resolve = res
    })

    // in dev mode clear the entire temp dir to ensure clean build?
    if (process.env.NODE_ENV === 'development') {
      try {
        // server.moduleGraph.invalidateAll()
        await rm(join(root, 'node_modules', '.vite', 'deps_ssr'), {
          recursive: true,
        })
      } catch (err) {
        if (err instanceof Error) {
          // @ts-expect-error wtf
          if (err.code !== 'ENOENT') {
            throw Error
          }
        }
      }
    }

    try {
      const exported = await server.ssrLoadModule(routeFile, {
        fixStacktrace: true,
      })

      const props = (await exported.generateStaticProps?.({ path, params })) ?? {}

      const { render } = await server.ssrLoadModule(`${routesDir}/../src/entry-server.tsx`)

      const { appHtml, headHtml } = await render({
        path,
        props,
      })

      const indexHtml = await readFile('./index.html', 'utf-8')
      const template = await server.transformIndexHtml(path, indexHtml)

      return getHtml({
        appHtml,
        headHtml,
        props,
        template,
      })
    } catch (err) {
      const message = err instanceof Error ? `${err.message}:\n${err.stack}` : `${err}`
      console.error(`Error in SSR: ${message}`)
      break
    } finally {
      currentSSRBuild = null
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

export function getHtml({
  template,
  props,
  appHtml,
  headHtml,
  css,
}: { css?: string; template: string; props: Object; appHtml: string; headHtml: string }) {
  const propsHtml = `\n<script>globalThis['__vxrnProps']=${JSON.stringify(props)}</script>`
  return template
    .replace(`<!--ssr-outlet-->`, appHtml + propsHtml)
    .replace(`<!--head-outlet-->`, `${headHtml}\n${css ? `<style>${css}</style>` : ``}`)
}
