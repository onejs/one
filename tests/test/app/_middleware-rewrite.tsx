import { createMiddleware } from 'one'

/**
 * Example middleware demonstrating URL rewriting capabilities for tests
 * 
 * This middleware shows two main features:
 * 1. Request rewriting - modifying the URL before it reaches the route handler
 * 2. Response interception - returning a response directly from middleware
 */
export default createMiddleware(async ({ request, next }) => {
  const url = new URL(request.url)
  const host = request.headers.get('host') || ''
  
  // Example 1: Subdomain-based rewriting
  // Handle *.localhost subdomains for local testing
  if (host.includes('.localhost')) {
    const subdomain = host.split('.')[0]
    
    // Rewrite subdomain.localhost/path to /server/subdomain/path
    if (subdomain && subdomain !== 'www') {
      const newUrl = new URL(request.url)
      newUrl.pathname = `/server/${subdomain}${newUrl.pathname}`
      
      // Pass the modified request to the next middleware/handler
      return next(new Request(newUrl, request))
    }
  }
  
  // Example 2: Path-based rewriting
  // Rewrite /api/v1/* to /api/v2/*
  if (url.pathname.startsWith('/api/v1/')) {
    const newUrl = new URL(request.url)
    newUrl.pathname = url.pathname.replace('/api/v1/', '/api/v2/')
    return next(new Request(newUrl, request))
  }
  
  // Example 3: Response interception
  // Middleware can return a response directly
  if (url.pathname === '/middleware-health') {
    return new Response(JSON.stringify({ 
      status: 'healthy',
      timestamp: Date.now(),
      middleware: 'rewrite'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Example 4: Testing rewrite with header
  // For testing purposes, allow header-based rewrites
  const rewriteTo = request.headers.get('x-rewrite-to')
  if (rewriteTo) {
    const newUrl = new URL(request.url)
    newUrl.pathname = rewriteTo
    return next(new Request(newUrl, request))
  }
  
  // Continue to next middleware/handler without modification
  return next()
})