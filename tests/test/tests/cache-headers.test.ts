import { describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL

describe('Cache Headers / ISR', () => {
  describe('SSR routes with setResponseHeaders', () => {
    it('should return cache-control headers set in loader', async () => {
      const response = await fetch(`${serverUrl}/ssr/cache-headers`)

      expect(response.status).toBe(200)

      const cacheControl = response.headers.get('cache-control')
      expect(cacheControl).toBe('public, s-maxage=3600, stale-while-revalidate=86400')
    })

    it('should return custom headers set in loader', async () => {
      const response = await fetch(`${serverUrl}/ssr/cache-headers`)

      expect(response.status).toBe(200)

      const customHeader = response.headers.get('x-custom-header')
      expect(customHeader).toBe('test-value')
    })

    it('should render the page and return HTML', async () => {
      const response = await fetch(`${serverUrl}/ssr/cache-headers`)
      const html = await response.text()

      // Verify we get HTML back (page rendered)
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html')
    })
  })

  describe('API routes with Response headers', () => {
    it('should return cache-control headers set on Response', async () => {
      const response = await fetch(`${serverUrl}/api/cache-headers`)

      expect(response.status).toBe(200)

      const cacheControl = response.headers.get('cache-control')
      expect(cacheControl).toBe('public, s-maxage=300, stale-while-revalidate=600')
    })

    it('should return custom headers set in API handler', async () => {
      const response = await fetch(`${serverUrl}/api/cache-headers`)

      expect(response.status).toBe(200)

      const customHeader = response.headers.get('x-api-cache')
      expect(customHeader).toBe('enabled')
    })

    it('should return JSON response with correct data', async () => {
      const response = await fetch(`${serverUrl}/api/cache-headers`)
      const data = await response.json()

      expect(data.message).toBe('API with cache headers')
      expect(typeof data.timestamp).toBe('number')
    })
  })

  describe('Middleware setResponseHeaders', () => {
    it('should set headers from middleware', async () => {
      const response = await fetch(`${serverUrl}/middleware`)

      // The middleware sets test-header via setResponseHeaders
      const testHeader = response.headers.get('test-header')
      expect(testHeader).toBe('test-value')
    })
  })
})
