import { isResponse } from '../utils/isResponse'
import { asyncHeadersCache, mergeHeaders, requestAsyncLocalStore } from './headers'

export function resolveAPIRequest(
  asyncImport: () => Promise<any>,
  request: Request,
  params?: Record<string, string>
) {
  if (!asyncImport) return

  return new Promise((res, rej) => {
    const id = { _id: Math.random() }
    requestAsyncLocalStore.run(id, async () => {
      try {
        const imported = await asyncImport()
        const requestType = request.method || 'GET'
        const handler = imported[requestType] || imported.default

        if (!handler) {
          console.warn(`No handler found for request ${requestType}`)
          return
        }

        let response = await handler(request, { params })

        const asyncHeaders = asyncHeadersCache.get(id)

        if (asyncHeaders) {
          try {
            if (response instanceof Response) {
              mergeHeaders(response.headers, asyncHeaders)
            } else {
              if (response && typeof response === 'object') {
                response = Response.json(response, { headers: asyncHeaders })
              } else {
                response = new Response(response as any, { headers: asyncHeaders })
              }
            }
          } catch (err) {
            if (`${err}`.includes('immutable')) {
              // we have to create a new response
              const body = response.body ? await streamToString(response.body) : ''
              response = new Response(body, {
                headers: response.headers,
                status: response.status,
                statusText: response.statusText,
              })
              mergeHeaders(response.headers, asyncHeaders)
            } else {
              console.error(` [vxs] error adding headers: ${err}`)
            }
          }
        }

        res(response)
      } catch (err) {
        // allow throwing a response
        if (isResponse(err)) {
          res(err)
        } else {
          rej(err) // reject the promise on any other error
        }
      }
    })
  })
}

async function streamToString(stream: ReadableStream) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      result += decoder.decode(value, { stream: true })
    }
  } catch (error) {
    console.error('Error reading the stream:', error)
  } finally {
    reader.releaseLock()
  }

  return result
}
