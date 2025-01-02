import { createMiddleware } from 'one'

export default createMiddleware(async ({ request, next }) => {
  if (request.url.endsWith(`?test-middleware`)) {
    return Response.json({ middleware: 'works' })
  }

  const response = await next()

  if (!response) {
    return Response.json({ notFound: true })
  }

  return response
})
