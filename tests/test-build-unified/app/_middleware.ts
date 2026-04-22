import { createMiddleware } from 'one'

export default createMiddleware(async ({ request, next }) => {
  const response = await next()
  response.headers.set('X-Root-Middleware', 'root-ran')
  return response
})
