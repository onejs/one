import { isResponse } from '../utils/isResponse'
import { asyncHeadersCache, mergeHeaders, runWithAsyncLocalContext } from './one-server-only'

export function resolveResponse(getResponse: () => Promise<Response>) {
  return new Promise<Response>((res, rej) => {
    runWithAsyncLocalContext(async (id) => {
      try {
        const response = await getResponse()
        const modifiedResponse = await getResponseWithAddedHeaders(response, id)
        res(modifiedResponse)
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

export function resolveAPIEndpoint(
  // this is the result of importing the file:
  runEndpoint: () => Promise<any>,
  request: Request,
  params: Record<string, string>
) {
  return resolveResponse(async () => {
    const imported = await runEndpoint()
    const requestType = request.method || 'GET'
    const handler = imported[requestType] || imported.default
    if (!handler) {
      console.warn(`No handler found for request ${requestType}`)
      return
    }
    return await handler(request, { params })
  })
}

async function getResponseWithAddedHeaders(response: any, id: Object) {
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
        console.error(` [one] error adding headers: ${err}`)
      }
    }
  }

  return response
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
