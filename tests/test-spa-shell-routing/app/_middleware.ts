import type { Middleware } from 'one'

// middleware that simulates auth checking
const middleware: Middleware = async ({ request, next }) => {
  const url = new URL(request.url)

  // skip static assets
  if (url.pathname.match(/\.[^/]+$/)) {
    return next()
  }

  // just pass through - we test that middleware doesn't break spa-shell mode
  return next()
}

export default middleware
