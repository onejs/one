import { asyncHeadersCache, mergeHeaders, requestAsyncLocalStore } from './headers'

export function resolveAPIRequest(asyncImport: () => Promise<any>, request: Request) {
  if (!asyncImport) return

  return new Promise((res) => {
    const id = { _id: Math.random() }
    requestAsyncLocalStore.run(id, async () => {
      const imported = await asyncImport()
      const requestType = request.method || 'GET'
      const handler = imported[requestType] || imported.default

      if (!handler) {
        console.warn(`No handler found for request ${requestType}`)
        return
      }

      let response = await handler(request)

      try {
        const asyncHeaders = asyncHeadersCache.get(id)
        if (asyncHeaders) {
          if (response instanceof Response) {
            mergeHeaders(response.headers, asyncHeaders)
          } else {
            if (response && typeof response === 'object') {
              response = Response.json(response, { headers: asyncHeaders })
            } else {
              response = new Response(response as any, { headers: asyncHeaders })
            }
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
