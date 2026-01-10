import { describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL

/**
 * Static routes should ALWAYS take priority over dynamic routes.
 * For example: /ssr/cache-headers (static) should match before /ssr/[param] (dynamic)
 */
describe('Route Priority - Static vs Dynamic', () => {
  describe('SSR routes', () => {
    it('static route /ssr/basic should match before /ssr/[param]', async () => {
      const response = await fetch(`${serverUrl}/ssr/basic`)
      const html = await response.text()

      // basic+ssr.tsx renders "This is a basic SSR page"
      expect(html).toContain('This is a basic SSR page')
      // Should NOT match [param]+ssr.tsx which shows "Param SSR"
      expect(html).not.toContain('Param SSR')
    })

    it('static route /ssr/cache-headers should match before /ssr/[param]', async () => {
      const response = await fetch(`${serverUrl}/ssr/cache-headers`)
      const html = await response.text()

      // cache-headers+ssr.tsx renders "Cache Headers Test"
      expect(html).toContain('Cache Headers Test')
      // Should NOT match [param]+ssr.tsx which shows "Param SSR"
      expect(html).not.toContain('Param SSR')
    })

    it('dynamic route /ssr/some-dynamic-value should match [param]', async () => {
      const response = await fetch(`${serverUrl}/ssr/some-dynamic-value`)
      const html = await response.text()

      // [param]+ssr.tsx should handle this with "Param SSR"
      expect(html).toContain('Param SSR')
      expect(html).toContain('some-dynamic-value')
    })
  })
})
