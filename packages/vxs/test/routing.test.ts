import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import * as path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const fixturePath = path.resolve(__dirname, '../../../examples/test')

const runTests = (environment: 'dev' | 'prod') => {
  describe(`Routing Tests (${environment})`, () => {
    let serverUrl: string
    let serverProcess: ChildProcessWithoutNullStreams | null = null

    beforeAll(async () => {
      const command = environment === 'dev' ? 'dev' : 'prod'
      serverProcess = spawn('yarn', [command, '--host', '127.0.0.1'], { cwd: fixturePath })
      let serverOutput = ''
      serverProcess.stdout.on('data', (data) => {
        console.info(data.toString())
        serverOutput += data.toString()
        if (serverOutput.includes('Server running on http://')) {
          const match = serverOutput.match(/Server running on (http:\/\/[^\s]+)/)
          if (match) {
            serverUrl = match[1]
          }
        }
      })

      const maxWaitTime = environment === 'dev' ? 15_000 : 30_000
      const startTime = Date.now()

      while (Date.now() - startTime < maxWaitTime) {
        if (serverUrl) {
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 300))
      }

      if (!serverUrl) {
        throw new Error('Server failed to start within the timeout period')
      }
    }, 60_000)

    afterAll(() => {
      if (serverProcess) {
        serverProcess.kill()
      }
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

      it('should handle not found routes', async () => {
        const response = await fetch(`${serverUrl}/not-found/non-existent-route`)
        const html = await response.text()

        expect(html).toContain('Custom 404: Page not found')
      })

      it('should return 404 status for non-existent routes', async () => {
        const response = await fetch(`${serverUrl}/not-found/non-existent-route`)
        expect(response.status).toBe(404)
      })
    })
  })
}

// Run tests for both dev and prod environments
runTests('dev')
runTests('prod')
