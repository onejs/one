import { asyncHeadersCache, mergeHeaders, requestAsyncLocalStore } from './headers'

export function resolveAPIRequest(module: any, request: Request) {
  if (!module) return

  const requestType = request.method || 'GET'
  const handler = module[requestType] || module.default
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
}
