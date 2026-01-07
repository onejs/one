import { ONLY_TEST_DEV, ONLY_TEST_PROD } from '@vxrn/test'
import { describe, expect, it } from 'vitest'

/**
 * Test for issue #446: SSR routes return 404 when layout present only in parent
 *
 * The issue occurs when:
 * - Parent directory has _layout.tsx
 * - Child directory does NOT have _layout.tsx
 * - Child directory has an SSR route
 *
 * In production, the route fails with:
 * TypeError: Cannot read properties of undefined (reading 'cleanPath')
 *
 * The [id] directory under /ssr/ has no _layout.tsx but inherits from parent.
 */
describe('SSR routes with parent layout only', () => {
  const serverUrl = process.env.ONE_SERVER_URL

  // This test specifically tests production mode where the issue occurs
  if (ONLY_TEST_DEV) {
    it('should pass in dev mode', () => {
      expect(true).toBeTruthy()
    })
    return
  }

  it('should have a valid server URL', () => {
    expect(serverUrl).toBeDefined()
    expect(serverUrl).toContain('http://localhost')
  })

  it('should return 200 for SSR route in child folder without its own layout', async () => {
    // The /ssr/[id]/request-test route is inside [id] folder which has no _layout.tsx
    // It inherits the layout from /ssr/_layout.tsx (parent)
    const response = await fetch(`${serverUrl}/ssr/test123/request-test`)

    // Before fix: This would return 500 or the response would fail
    // due to "Cannot read properties of undefined (reading 'cleanPath')"
    expect(response.status).toBe(200)

    const html = await response.text()
    expect(html).toContain('SSR Request Test with Params')
  })

  it('should correctly pass params to SSR loader in child folder without layout', async () => {
    const testId = 'myTestParam456'
    const response = await fetch(`${serverUrl}/ssr/${testId}/request-test`)

    expect(response.status).toBe(200)

    const html = await response.text()
    // The loader should have received the id param
    expect(html).toContain(testId)
  })

  it('should return 200 for SSR routes at parent level', async () => {
    // /ssr/basic is in the same directory as _layout.tsx - should work
    const response = await fetch(`${serverUrl}/ssr/basic`)
    expect(response.status).toBe(200)
  })
})
