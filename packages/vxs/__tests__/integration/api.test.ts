import fetch from 'node-fetch'
import { spawn } from 'node:child_process'
import * as path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const fixturePath = path.resolve(__dirname, '../../../../examples/basic')

describe('Route Params Tests', () => {
  let serverUrl
  let devProcess

  beforeAll(async () => {
    // Spawn the dev server process
    devProcess = spawn('yarn', ['dev'], { cwd: fixturePath })

    let yarnDevOutput = ''
    devProcess.stdout.on('data', (data) => {
      yarnDevOutput += data.toString()
      if (yarnDevOutput.includes('Server running on http://')) {
        const match = yarnDevOutput.match(/Server running on (http:\/\/[^\s]+)/)
        if (match) {
          serverUrl = match[1]
          console.log(`Server is running on ${serverUrl}`)
        }
      }
    })

    // Wait for the server to start or timeout
    const maxWaitTime = 30000 // 30 seconds
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
  }, 35000)

  afterAll(() => {
    // Kill the dev server process
    if (devProcess) {
      devProcess.kill()
    }
  })

  describe('GET /api/test-params/[endpointId]', () => {
    it('should return correct endpointId and testParam', async () => {
      const endpointId = '123'
      const testParam = 'hello'
      const response = await fetch(
        `${serverUrl}/api/test-params/${endpointId}?testParam=${testParam}`
      )
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
})
