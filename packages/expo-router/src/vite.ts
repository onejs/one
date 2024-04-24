import { sync as globSync } from 'glob'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { Connect, Plugin, ViteDevServer } from 'vite'
import { type ExpoRoutesManifestV1, createRoutesManifest } from './routes-manifest'

type Options = {
  root: string
}

export function createFileSystemRouter(options: Options): Plugin {
  console.log('options', options)
  const { root } = options

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
        const routePaths = getRoutePaths(root)
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
            if (!req.url) return

            if (await handleAPIRoutes(options, server, req, apiRoutesMap)) {
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
              next(new Error("SSR handler didn't send a response"))
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
  const matched = apiRoutesMap[req.url!]
  if (matched) {
    const loaded = await server.ssrLoadModule(join(options.root, matched.file))
    if (loaded) {
      const requestType = req.method || 'GET'
      const method = loaded[requestType]
      if (method) {
        method(req)
        return true
      }
    }
  }
}

async function handleSSR(
  { root }: Options,
  server: ViteDevServer,
  req: Connect.IncomingMessage,
  manifest: ExpoRoutesManifestV1<string>
) {
  if (!req.url) return
  if (req.url.startsWith('/@')) return
  if (req.url === '/__vxrnhmr') return

  const pathOg = req.url === '/index.html' ? '/' : req.url
  const url = new URL(pathOg, 'http://tamagui.dev')
  const path = url.pathname // sanitized

  for (const route of manifest.htmlRoutes) {
    // TODO performance
    if (!new RegExp(route.namedRegex).test(path)) {
      continue
    }

    const params = getParams(url, route)
    const routeFile = join(root, route.file)

    try {
      server.moduleGraph.invalidateAll()

      const exported = await server.ssrLoadModule(routeFile, {
        fixStacktrace: true,
      })

      const props = (await exported.generateStaticProps?.({ path, params })) ?? {}

      const { render } = await server.ssrLoadModule(`${root}/../src/entry-server.tsx`)

      console.trace(`SSR loaded the server entry, rendering...`)

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
