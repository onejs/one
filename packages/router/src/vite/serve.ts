import { defineEventHandler, type App } from 'h3'
import { getOptionsFilled, type VXRNConfig } from 'vxrn'
import { createHandleRequest } from '../handleRequest'
import { IncomingMessage } from 'http'

export async function serve(optionsIn: VXRNConfig, app: App) {
  const options = await getOptionsFilled(optionsIn)
  const handler = createHandleRequest(
    {
      root: options.root,
    },
    {
      async handleAPI(props) {
        console.log('handle api!')
        return {
          response: { hello: 'world' },
        }
        // const loaded = await server.ssrLoadModule(join(options.root, route.file))
        // if (!loaded) return

        // const requestType = request.method || 'GET'
        // const handler = loaded[requestType] || loaded.default
        // if (!handler) return

        // return new Promise((res) => {
        //   const id = {}
        //   requestAsyncLocalStore.run(id, async () => {
        //     try {
        //       let response = await handler(request)
        //       const asyncHeaders = asyncHeadersCache.get(id)
        //       if (asyncHeaders) {
        //         if (response instanceof Response) {
        //           mergeHeaders(response.headers, asyncHeaders)
        //         } else {
        //           response = new Response(response, { headers: asyncHeaders })
        //         }
        //       }
        //       res(response)
        //     } catch (err) {
        //       // allow throwing a response
        //       if (err instanceof Response) {
        //         res(err)
        //       } else {
        //         throw err
        //       }
        //     }
        //   })
        // })
      },
    }
  )

  app.use(
    defineEventHandler(async (e) => {
      const reply = await handler(await convertIncomingMessageToRequest(e.node.req))

      console.log('got reply', reply)

      return Response.json(reply?.response)
    })
  )
}

const convertIncomingMessageToRequest = async (req: IncomingMessage): Promise<Request> => {
  const urlBase = `http://${req.headers.host}`
  const urlString = req.url || ''
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

function readStream(stream: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    stream.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}
