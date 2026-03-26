import { isResponse } from '../utils/isResponse'
import {
  type ALSId,
  asyncHeadersCache,
  mergeHeaders,
  requestAsyncLocalStore,
  runWithAsyncLocalContext,
} from './one-server-only'

// lightweight monotonic id - avoids Math.random() per request
let _nextId = 1
function createId(): ALSId {
  return { _id: _nextId++ }
}

export async function resolveResponse(getResponse: () => Promise<Response>) {
  // always read ALS from globalThis to match the bundled server code
  const store =
    requestAsyncLocalStore ??
    (globalThis['__vxrnrequestAsyncLocalStore'] as typeof requestAsyncLocalStore)
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
 * enter ALS context once for the entire request handler.
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
  // read from globalThis to match the bundled server code's cache instance
  const cache: WeakMap<any, Headers> =
    globalThis['__vxrnasyncHeadersCache'] ?? asyncHeadersCache
  const asyncHeaders = cache.get(id)

  if (asyncHeaders) {
    try {
      if (response instanceof Response) {
        // create a new response with merged headers rather than mutating in place,
        // because hono's compress middleware captures headers at response creation time
        // and won't see mutations made to response.headers after the fact.
        // clone first so the original body stream isn't locked/consumed
        // (Response.json() bodies are single-use ReadableStreams)
        const cloned = response.clone()
        const headers = new Headers(cloned.headers)
        mergeHeaders(headers, asyncHeaders)
        response = new Response(cloned.body, {
          status: cloned.status,
          statusText: cloned.statusText,
          headers,
        })
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
      console.error(` [one] error adding headers: ${err}`)
    }
  }

  return response
}
