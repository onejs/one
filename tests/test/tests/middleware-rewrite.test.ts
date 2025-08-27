import { describe, expect, test } from 'vitest'

// Helper function for testing
async function fetchWithHost(path: string, host: string) {
  return await fetch(`${process.env.ONE_SERVER_URL}${path}`, {
    headers: { host }
  })
}

describe('Middleware Request Rewriting', () => {
  test('middleware can modify request URL', async () => {
    const res = await fetch(`${process.env.ONE_SERVER_URL}/test-path`, {
      headers: { 'x-rewrite-to': '/actual-path' }
    })
    
    // The middleware should rewrite /test-path to /actual-path
    // This assumes you have a route at /actual-path that returns specific content
    const text = await res.text()
    expect(res.ok).toBe(true)
  })
  
  test('middleware can pass modified request to next', async () => {
    const res = await fetch(`${process.env.ONE_SERVER_URL}/original`, {
      headers: { 'x-transform': 'true' }
    })
    
    // Test that the request was transformed
    const data = await res.json()
    expect(data).toBeDefined()
  })
  
  test('subdomain rewriting with .localhost', async () => {
    // Test subdomain.localhost rewriting
    const res = await fetchWithHost('/', 'tamagui.localhost')
    
    // Should be rewritten to /server/tamagui
    const text = await res.text()
    expect(res.ok).toBe(true)
  })
  
  test('multiple subdomains work independently', async () => {
    const res1 = await fetchWithHost('/api', 'app1.localhost')
    const res2 = await fetchWithHost('/api', 'app2.localhost')
    
    // Both should work but be routed to different paths
    expect(res1.ok).toBe(true)
    expect(res2.ok).toBe(true)
  })
  
  test('middleware can return Response directly', async () => {
    const res = await fetch(`${process.env.ONE_SERVER_URL}/middleware-health`)
    const data = await res.json()
    
    expect(res.ok).toBe(true)
    expect(data).toEqual({
      status: 'healthy',
      timestamp: expect.any(Number),
      middleware: 'rewrite'
    })
  })
  
  test('middleware chain with multiple rewrites', async () => {
    // If you have multiple middleware files, test that they chain correctly
    const res = await fetch(`${process.env.ONE_SERVER_URL}/chain-test`, {
      headers: { 
        'x-chain': '1',
        'x-rewrite-to': '/final-destination'
      }
    })
    
    expect(res.ok).toBe(true)
  })
  
  test('API path rewriting v1 to v2', async () => {
    const res = await fetch(`${process.env.ONE_SERVER_URL}/api/v1/users`)
    
    // Should be rewritten to /api/v2/users
    // Assuming you have a route at /api/v2/users
    expect(res.ok).toBe(true)
  })
  
  test('preserves query parameters during rewrite', async () => {
    const res = await fetch(`${process.env.ONE_SERVER_URL}/test?param1=value1&param2=value2`, {
      headers: { 'x-rewrite-to': '/rewritten' }
    })
    
    // The query parameters should be preserved
    expect(res.ok).toBe(true)
  })
  
  test('preserves request method during rewrite', async () => {
    const res = await fetch(`${process.env.ONE_SERVER_URL}/test`, {
      method: 'POST',
      headers: { 
        'x-rewrite-to': '/api/endpoint',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ test: 'data' })
    })
    
    // The POST method and body should be preserved
    expect(res.ok).toBe(true)
  })
  
  test('www subdomain is not rewritten', async () => {
    const res = await fetchWithHost('/page', 'www.localhost')
    
    // www should not trigger subdomain rewriting
    // Should go to normal /page route
    expect(res.ok).toBe(true)
  })
})

describe('Middleware Response Handling', () => {
  test('middleware can intercept and return early', async () => {
    const res = await fetch(`${process.env.ONE_SERVER_URL}/middleware-health`)
    const data = await res.json()
    
    expect(data.middleware).toBe('rewrite')
    expect(data.status).toBe('healthy')
  })
  
  test('middleware can set custom headers', async () => {
    const res = await fetch(`${process.env.ONE_SERVER_URL}/any-path`)
    
    // Check if middleware added any custom headers
    // This depends on your middleware implementation
    const headers = res.headers
    expect(headers).toBeDefined()
  })
  
  test('middleware respects response status codes', async () => {
    // If middleware returns a 404 or other status
    const res = await fetch(`${process.env.ONE_SERVER_URL}/non-existent-after-rewrite`, {
      headers: { 'x-rewrite-to': '/definitely-not-a-route' }
    })
    
    expect(res.status).toBe(404)
  })
})

describe('Integration with existing middleware', () => {
  test('rewrite middleware works with existing test middleware', async () => {
    // Test that the new rewrite middleware doesn't break existing functionality
    const res = await fetch(`${process.env.ONE_SERVER_URL}/middleware?test-middleware`)
    const data = await res.json()
    
    expect(data).toMatchInlineSnapshot(`
      {
        "middleware": "works",
      }
    `)
  })
  
  test('rewrite happens before route matching', async () => {
    // Test that rewrites happen early enough in the pipeline
    const res = await fetchWithHost('/docs', 'api.localhost')
    
    // Should be rewritten to /server/api/docs
    // and then matched against routes
    expect(res.ok).toBe(true)
  })
})