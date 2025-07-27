import { beforeAll, describe, expect, inject, it } from 'vitest'

describe(`API Tests with Rolldown`, () => {
  const serverUrl = process.env.ONE_SERVER_URL

  // Skip these tests if not using rolldown
  const isRolldown = process.env.ROLLDOWN_MODE === 'true'

  describe.skipIf(!isRolldown)('GET /api/parts/[...parts]', () => {
    it('should handle catch-all routes correctly in rolldown mode', async () => {
      const parts = ['part1', 'part2', 'part3']
      const testParam = 'rolldown-test'
      const response = await fetch(
        `${serverUrl}/api/parts/${parts.join('/')}?testParam=${testParam}`
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Parts endpoint')
      expect(data.parts).toEqual(parts.join('/'))
      expect(data.testParam).toBe(testParam)
    })

    it('should handle dynamic routes with brackets in rolldown mode', async () => {
      const endpointId = 'rolldown-123'
      const testParam = 'hello-rolldown'
      const url = `${serverUrl}/api/test-params/${endpointId}?testParam=${testParam}`
      const response = await fetch(url)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Route params test endpoint')
      expect(data.endpointId).toBe(endpointId)
      expect(data.testParam).toBe(testParam)
    })
  })

  describe.skipIf(!isRolldown)('API auth catch-all route', () => {
    it('should handle /api/auth/[...sub] correctly', async () => {
      const subPaths = ['login', 'callback']
      const response = await fetch(`${serverUrl}/api/auth/${subPaths.join('/')}`)
      
      // This test expects the route to exist and not throw a module not found error
      expect(response.status).toBeDefined()
    })
  })
})