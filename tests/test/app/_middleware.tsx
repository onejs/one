import { createMiddleware } from 'one'
// testing it doesnt bundle on client - importing node:fs should work in middleware
import { readFile } from 'node:fs'

void readFile

export default createMiddleware(async ({ request, next }) => {
  if (request.url.includes(`test-middleware`)) {
    return Response.json({ middleware: 'works' })
  }

  // test dynamic import of a module that imports 'server-only'
  if (request.url.includes('test-server-only-dynamic')) {
    const { checkServerAuth } = await import('../features/server-auth')
    return Response.json({ auth: checkServerAuth() })
  }

  const response = await next()

  if (!response && request.url.endsWith('/missing')) {
    return Response.json({ notFound: true })
  }

  // test: wrap response in new Response with extra headers
  // validates that next() always returns a proper Response object
  if (response && request.url.includes('test-wrap-response')) {
    const headers = new Headers(response.headers)
    headers.set('X-Custom-Wrap', 'wrapped')
    headers.set('Cache-Control', 'no-cache')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }

  return response
})
