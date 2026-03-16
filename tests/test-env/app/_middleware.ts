import { createMiddleware } from 'one'
import { getViteEnvironment } from '../src/check-env'

export default createMiddleware(async ({ request, next }) => {
  if (request.url.includes('test-env-middleware')) {
    return Response.json({
      viteEnvironment: getViteEnvironment(),
    })
  }

  return next()
})
