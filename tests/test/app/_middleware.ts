import { createMiddleware } from 'one'

export default createMiddleware(async ({ request, next }) => {
  if (request.url.endsWith(`?test-middleware`)) {
    return Response.json({ middleware: 'works' })
  }

  const response = await next()

  console.warn('response', response)

  return response
})
