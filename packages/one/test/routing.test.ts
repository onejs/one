import { beforeAll, describe, expect, it, inject } from 'vitest'

const runTests = (environment: 'dev' | 'prod') => {
  describe(`Routing Tests (${environment})`, () => {
    let serverUrl: string

    beforeAll(() => {
      const testInfo = inject('testInfo')
      const port = environment === 'dev' ? testInfo.testDevPort : testInfo.testProdPort
      serverUrl = `http://localhost:${port}`
    })

    describe('Basic routing', () => {
      it('should render the home page', async () => {
        const response = await fetch(serverUrl)
        const html = await response.text()

        expect(html).toContain('Welcome to VXS')
      })

      it('should return 200 status for the home page', async () => {
        const response = await fetch(serverUrl)
        expect(response.status).toBe(200)
      })

      it('should render the SSR page', async () => {
        const response = await fetch(`${serverUrl}/ssr/basic`)
        const html = await response.text()

        expect(html).toContain('This is a basic SSR page')
      })

      it('should return 200 status for the SSR page', async () => {
        const response = await fetch(`${serverUrl}/ssr/basic`)
        expect(response.status).toBe(200)
      })

      // it('should handle not found routes', async () => {
      //   const response = await fetch(`${serverUrl}/not-found/non-existent-route`)
      //   const html = await response.text()

      //   expect(html).toContain('Custom 404: Page not found')
      // })

      it('should return 404 status for non-existent routes', async () => {
        const response = await fetch(`${serverUrl}/not-found/non-existent-route`)
        expect(response.status).toBe(404)
      })

      it('should render page from inside a group', async () => {
        const response = await fetch(`${serverUrl}/about`)
        const html = await response.text()
        expect(html).toContain('About Our Company')
      })

      it('should render page from subdir when parent group name is the same', async () => {
        const response = await fetch(`${serverUrl}/blog/my-first-post`)
        const html = await response.text()
        expect(html).toContain('My First Post')
      })
    })
  })
}

// Run tests for both dev and prod environments
runTests('dev')
runTests('prod')
