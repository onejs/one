import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import * as path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const fixturePath = path.resolve(__dirname, '../../../examples/test')

const runTests = (environment: 'dev' | 'prod') => {
  describe(`API Tests (${environment})`, () => {
    let serverUrl
    let serverProcess: ChildProcessWithoutNullStreams | null = null

    beforeAll(async () => {
      // Spawn the server process based on the environment
      const command = environment === 'dev' ? 'dev' : 'prod'
      serverProcess = spawn('yarn', [command, '--host', 'localhost'], { cwd: fixturePath })

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

      // Wait for the server to start or timeout
      const maxWaitTime = environment === 'dev' ? 5_000 : 30_000
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
      // Kill the server process
      if (serverProcess) {
        serverProcess.kill()
      }
    })

    describe('GET /api/test-params/[endpointId]', () => {
      it('should return correct endpointId and testParam', async () => {
        const endpointId = '123'
        const testParam = 'hello'
        const url = `${serverUrl}/api/test-params/${endpointId}?testParam=${testParam}`
        const response = await fetch(url)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Route params test endpoint')
        expect(data.endpointId).toBe(endpointId)
        expect(data.testParam).toBe(testParam)
      })

      it('should handle missing testParam', async () => {
        const endpointId = '456'
        const response = await fetch(`${serverUrl}/api/test-params/${endpointId}`)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Route params test endpoint')
        expect(data.endpointId).toBe(endpointId)
        expect(data.testParam).toBeNull()
      })
    })

    describe('POST /api/test-params/[endpointId]', () => {
      it('should handle POST request with endpointId and body', async () => {
        const endpointId = '789'
        const testData = { key: 'value' }
        const response = await fetch(`${serverUrl}/api/test-params/${endpointId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testData }),
        })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('POST request received')
        expect(data.endpointId).toBe(endpointId)
        expect(data.receivedData).toEqual(testData)
      })

      it('should return 400 for invalid request data', async () => {
        const endpointId = '101'
        const response = await fetch(`${serverUrl}/api/test-params/${endpointId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid request data')
      })
    })

    describe('GET /api/parts/[...parts]', () => {
      it('should return correct parts and testParam', async () => {
        const parts = ['part1', 'part2']
        const testParam = 'hello'
        const response = await fetch(
          `${serverUrl}/api/parts/${parts.join('/')}?testParam=${testParam}`
        )
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Parts endpoint')
        expect(data.parts).toEqual(parts.join('/'))
        expect(data.testParam).toBe(testParam)
      })

      it('should handle missing testParam', async () => {
        const parts = ['part3', 'part4']
        const response = await fetch(`${serverUrl}/api/parts/${parts.join('/')}`)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Parts endpoint')
        expect(data.parts).toEqual(parts.join('/'))
        expect(data.testParam).toBeNull()
      })
    })

    describe('POST /api/parts/[...parts]', () => {
      it('should handle POST request with parts and body', async () => {
        const parts = ['part5', 'part6']
        const testData = { key: 'value' }
        const response = await fetch(`${serverUrl}/api/parts/${parts.join('/')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testData }),
        })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('POST request received')
        expect(data.parts).toEqual(parts.join('/'))
        expect(data.receivedData).toEqual(testData)
      })

      it('should return 400 for invalid request data', async () => {
        const parts = ['part7', 'part8']
        const response = await fetch(`${serverUrl}/api/parts/${parts.join('/')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        })
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid request data')
      })
    })

    describe('GET /api/response-type', () => {
      it('should return default response', async () => {
        const response = await fetch(`${serverUrl}/api/response-type`)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Default response')
        expect(data.data).toBe('This is the default response data')
      })

      it('should return JSON response', async () => {
        const response = await fetch(`${serverUrl}/api/response-type?responseType=json`)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('JSON response')
        expect(data.data).toEqual({ key: 'value', description: 'This is the JSON response data' })
      })
    })
  })
}

// Run tests for both dev and prod environments
runTests('dev')
runTests('prod')
