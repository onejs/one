import { createMiddleware } from 'one'

export default createMiddleware(async ({ request, next }) => {
  const response = await next()

  // Add a custom header to prove middleware ran
  response.headers.set('X-Middleware-Test', 'vercel-middleware-works')

  return response
})
