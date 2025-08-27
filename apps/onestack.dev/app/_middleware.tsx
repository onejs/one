import { createMiddleware } from 'one'

/**
 * Middleware for handling URL rewrites in onestack.dev
 * This handles subdomain routing for testing purposes
 */
export default createMiddleware(async ({ request, next }) => {
  const url = new URL(request.url)
  const host = request.headers.get('host') || ''
  
  // Handle subdomain rewrites for .localhost domains
  if (host.includes('.localhost')) {
    const parts = host.split('.')
    const subdomain = parts[0]
    
    // Special case for docs.localhost
    if (subdomain === 'docs') {
      const newUrl = new URL(request.url)
      newUrl.pathname = `/docs${url.pathname === '/' ? '' : url.pathname}`
      return next(new Request(newUrl, request))
    }
    
    // General subdomain handling
    if (subdomain && subdomain !== 'www') {
      const newUrl = new URL(request.url)
      newUrl.pathname = `/subdomain/${subdomain}${url.pathname}`
      return next(new Request(newUrl, request))
    }
  }
  
  // Handle path rewrites
  if (url.pathname.startsWith('/old-docs/')) {
    const newUrl = new URL(request.url)
    newUrl.pathname = url.pathname.replace('/old-docs/', '/docs/')
    return next(new Request(newUrl, request))
  }
  
  // Test response interception
  if (url.pathname === '/test-middleware-response') {
    return new Response(JSON.stringify({
      message: 'Direct response from middleware',
      timestamp: Date.now(),
      host,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  return next()
})