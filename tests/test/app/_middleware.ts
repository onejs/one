import { createMiddleware } from 'one'

export default createMiddleware((req) => {
  if (req.url.endsWith(`?test-middleware`)) {
    return Response.json({ middleware: 'works' })
  }
})
