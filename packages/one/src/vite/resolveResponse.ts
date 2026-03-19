import { isResponse } from '../utils/isResponse'
import {
  asyncHeadersCache,
  mergeHeaders,
  requestAsyncLocalStore,
  runWithAsyncLocalContext,
} from './one-server-only'

// lightweight monotonic id - avoids Math.random() per request
let _nextId = 1
function createId() {
  return { _id: _nextId++ }
}

export async function resolveResponse(getResponse: () => Promise<Response>) {
  // inline ALS to reduce async nesting (each await = microtask = event loop pressure)
  const store = requestAsyncLocalStore
  if (store) {
    const id = createId()
    let response: Response
    await store.run(id, async () => {
      try {
        response = await getResponse()
        response = await getResponseWithAddedHeaders(response!, id)
      } catch (err) {
        if (isResponse(err)) {
          response = err as Response
        } else {
          throw err
        }
      }
    })
    return response!
  }
  // fallback for non-SSR contexts
  return runWithAsyncLocalContext(async (id) => {
    try {
      const response = await getResponse()
      return await getResponseWithAddedHeaders(response, id)
    } catch (err) {
      if (isResponse(err)) {
        return err as Response
      }
      throw err
    }
  })
}

/**
 * lightweight version that assumes ALS context is already active.
 * skips store.run() overhead and just handles response + error wrapping.
 * use inside a `withRequestContext()` scope.
 */
export async function resolveResponseLite(getResponse: () => Promise<Response>): Promise<Response> {
  try {
    const response = await getResponse()
    // still check for async headers in case middleware set them
    const store = requestAsyncLocalStore
    if (store) {
      const id = store.getStore()
      if (id) {
        return await getResponseWithAddedHeaders(response, id as object)
      }
    }
    return response
  } catch (err) {
    if (isResponse(err)) {
      return err as Response
    }
    throw err
  }
}

/**
 * enter ALS context once for the entire request handler.
 * downstream code can use resolveResponseLite to skip redundant store.run().
 */
export function withRequestContext<T>(fn: () => Promise<T>): Promise<T> {
  const store = requestAsyncLocalStore
  if (store) {
    const id = createId()
    return store.run(id, fn) as Promise<T>
  }
  return fn()
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

async function getResponseWithAddedHeaders(response: any, id: object) {
  const asyncHeaders = asyncHeadersCache.get(id)

  if (asyncHeaders) {
    try {
      if (response instanceof Response) {
        mergeHeaders(response.headers, asyncHeaders)
      } else {
        if (response && typeof response === 'object') {
          response = Response.json(response, { headers: asyncHeaders })
        } else {
          // for string responses (like html), we need to preserve content-type
          // if not explicitly set in asyncHeaders
          const headers = new Headers(asyncHeaders)
          if (!headers.has('content-type')) {
            // assume html for string responses since that's the common case
            // (dev mode returns html strings from handlePage)
            headers.set('content-type', 'text/html')
          }
          response = new Response(response as any, { headers })
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
