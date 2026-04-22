import { createMiddleware } from 'one'

export default createMiddleware(async ({ request, next }) => {
  const response = await next()
  response.headers.set('X-Nested-Middleware', 'nested-ran')
  return response
})
