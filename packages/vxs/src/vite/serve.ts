import { defineEventHandler, type App } from 'h3'
import { getOptionsFilled, type VXRNConfig } from 'vxrn'
import { createHandleRequest } from '../handleRequest'
import type { IncomingMessage } from 'node:http'
import { join } from 'node:path'
import { resolveAPIRequest } from './resolveAPIRequest'

export async function serve(optionsIn: VXRNConfig, app: App) {
  const options = await getOptionsFilled(optionsIn)
  const handler = createHandleRequest(
    {
      root: options.root,
    },
    {
      async handleAPI({ route, request }) {
        const apiFile = join(process.cwd(), 'dist/api', route.page + '.js')
        const exported = await import(apiFile)
        return resolveAPIRequest(exported, request)
      },
    }
  )

  app.use(
    defineEventHandler(async (e) => {
      const reply = await handler(await convertIncomingMessageToRequest(e.node.req))

      console.log('got reply', reply)

      return reply
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
