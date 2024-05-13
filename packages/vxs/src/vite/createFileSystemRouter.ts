import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Connect, Plugin } from 'vite'
import { getHtml } from 'vxrn'
import { createHandleRequest } from '../handleRequest'
import { LoaderDataCache } from './constants'
import { asyncHeadersCache, mergeHeaders, requestAsyncLocalStore } from './headers'
import { loadEnv } from './loadEnv'

export type Options = {
  root: string
  shouldIgnore?: (req: Request) => boolean
  disableSSR?: boolean
}

export function createFileSystemRouter(options: Options): Plugin {
  const { root } = options

  // TODO need a higher level package
  void loadEnv(process.cwd()).then(() => {
    // console.log('loading env', process.env.POSTMARK_SERVER_TOKEN)
  })

  return {
    name: `router-fs`,
    enforce: 'post',
    apply: 'serve',

    configureServer(server) {
      const handleRequest = createHandleRequest(options, {
        async handleSSR({ route, url, loaderProps }) {
          const indexHtml = await readFile('./index.html', 'utf-8')
          const template = await server.transformIndexHtml(url.pathname, indexHtml)
          // if (disableSSR) {
          //   return indexHtml
          // }
          const routeFile = join(root, route.file)

          // warm up the entry
          void server.warmupRequest(routeFile)

          // importing resetState causes issues :/
          globalThis['__vxrnresetState']?.()

          try {
            const exported = await server.ssrLoadModule(routeFile, {
              fixStacktrace: true,
            })

            const loaderData = await exported.loader?.(loaderProps)
            const entryServer = `${root}/../src/entry-server.tsx`

            // TODO move to tamagui plugin, also esbuild was getting mad
            // biome-ignore lint/security/noGlobalEval: <explanation>
            eval(`process.env.TAMAGUI_IS_SERVER = '1'`)

            const { render } = await server.ssrLoadModule(entryServer, {
              fixStacktrace: true,
            })

            globalThis['__vxrnLoaderData__'] = loaderData
            LoaderDataCache[route.file] = loaderData

            const { appHtml, headHtml } = await render(loaderProps)

            return getHtml({
              appHtml,
              headHtml,
              loaderData,
              template,
            })
          } catch (err) {
            console.error(`Error rendering ${url.pathname} on server:`)
            if (err instanceof Error) {
              console.error(err.message)
              console.error(err.stack)
            }
          }

          return template
        },

        async handleLoader({ request, route, loaderProps }) {
          const routeFile = join(root, route.file)
          // this will remove all loaders
          let transformedJS = (await server.transformRequest(routeFile))?.code
          if (!transformedJS) {
            throw new Error(`No transformed js returned`)
          }
          // if (disableSSR) {
          //   return transformedJS
          // }
          const exported = await server.ssrLoadModule(routeFile, {
            fixStacktrace: true,
          })
          const loaderData = await exported.loader?.(loaderProps)
          if (loaderData) {
            // add loader back in!
            transformedJS = transformedJS.replace(
              /function\s+loader\(\)\s+{\s+return \[\]\[0\];?\s+}/gm,
              `function loader(){ return ${JSON.stringify(loaderData)} }`
            )
          }
          return transformedJS
        },

        async handleAPI({ request, route }) {
          const loaded = await server.ssrLoadModule(join(options.root, route.file), {
            fixStacktrace: true,
          })
          if (!loaded) return

          const requestType = request.method || 'GET'
          const handler = loaded[requestType] || loaded.default
          if (!handler) return

          return new Promise((res) => {
            const id = {}
            requestAsyncLocalStore.run(id, async () => {
              try {
                let response = await handler(request)
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
        },
      })

      // Instead of adding the middleware here, we return a function that Vite
      // will call after adding its own middlewares. We want our code to run after
      // Vite's transform middleware so that we can focus on handling the requests
      // we're interested in.
      return () => {
        server.middlewares.use(async (req, res, next) => {
          try {
            const reply = await handleRequest(await convertIncomingMessageToRequest(req))

            if (!reply) {
              return next()
            }

            if (reply instanceof Response) {
              res.statusCode = reply.status
              res.statusMessage = reply.statusText

              const contentType = reply.headers.get('Content-Type')
              if (contentType) {
                res.setHeader('Content-Type', contentType)
              }

              const outString =
                contentType === 'application/json'
                  ? JSON.stringify(await reply.json())
                  : await reply.text()

              res.write(outString)
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

const convertIncomingMessageToRequest = async (req: Connect.IncomingMessage): Promise<Request> => {
  if (!req.originalUrl) {
    throw new Error(`Can't convert`)
  }

  const urlBase = `http://${req.headers.host}`
  const urlString = req.originalUrl || ''
  const url = new URL(urlString, urlBase)

  const headers = new Headers()
  for (const key in req.headers) {
    if (req.headers[key]) headers.append(key, req.headers[key] as string)
  }

  return new Request(url, {
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
