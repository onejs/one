import { createMiddleware } from 'one'
import { readFile } from 'node:fs'

// testing it doesnt bundle on client
console.info(readFile)

export default createMiddleware(async ({ request, next }) => {
  if (request.url.includes(`test-middleware`)) {
    return Response.json({ middleware: 'works' })
  }

  const response = await next()

  if (!response && request.url.endsWith('/missing')) {
    return Response.json({ notFound: true })
  }

  return response
})
