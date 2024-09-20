import { spawn } from 'node:child_process'
import * as path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const fixturePath = path.resolve(__dirname, '../../../../examples/test')

describe('Simple Run Tests', () => {
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
        }
      }
    })

    // Wait for the server to start or timeout
    const maxWaitTime = 10000 // 30 seconds
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
  })

  afterAll(() => {
    // Kill the dev server process
    if (devProcess) {
      devProcess.kill()
    }
  })

  it('should start the dev server', () => {
    expect(serverUrl).toBeDefined()
  }, 30_000)

  describe('GET /api/test', () => {
    it('should return test items', async () => {
      const response = await fetch(`${serverUrl}/api/test`)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
    })

    it('should return 404 when forceError=notFound', async () => {
      const response = await fetch(`${serverUrl}/api/test?forceError=notFound`)
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toBe('Items not found')
    })

    it('should return 500 when forceError=serverError', async () => {
      const response = await fetch(`${serverUrl}/api/test?forceError=serverError`)
      const data = await response.json()
      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('POST /api/test', () => {
    it('should create a new item', async () => {
      const newItem = { name: 'New Test Item', description: 'New Description' }
      const response = await fetch(`${serverUrl}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      })
      const data = await response.json()
      expect(response.status).toBe(201)
      expect(data.name).toBe(newItem.name)
      expect(data.description).toBe(newItem.description)
    })

    it('should return 400 when forceError=badRequest', async () => {
      const response = await fetch(`${serverUrl}/api/test?forceError=badRequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid data')
    })

    it('should return 500 when forceError=serverError', async () => {
      const response = await fetch(`${serverUrl}/api/test?forceError=serverError`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('PUT /api/test', () => {
    it('should update an existing item', async () => {
      const updatedItem = { id: 1, name: 'Updated Test Item', description: 'Updated Description' }
      const response = await fetch(`${serverUrl}/api/test`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem),
      })
      let data
      try {
        data = await response.json()
      } catch (error) {}
      expect(response.status).toBe(200)
      expect(data.name).toBe(updatedItem.name)
      expect(data.description).toBe(updatedItem.description)
    })

    it('should return 404 when item not found', async () => {
      const nonExistentItem = { id: 9999, name: 'Non-existent', description: 'Does not exist' }
      const response = await fetch(`${serverUrl}/api/test`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nonExistentItem),
      })
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toBe('Item not found')
    })

    it('should return 500 when forceError=serverError', async () => {
      const response = await fetch(`${serverUrl}/api/test?forceError=serverError`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('DELETE /api/test', () => {
    it('should delete an existing item', async () => {
      const itemToDelete = { id: 2 }
      const response = await fetch(`${serverUrl}/api/test`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemToDelete),
      })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 404 when item not found', async () => {
      const nonExistentItem = { id: 9999 }
      const response = await fetch(`${serverUrl}/api/test`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nonExistentItem),
      })
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toBe('Item not found')
    })

    it('should return 500 when forceError=serverError', async () => {
      const response = await fetch(`${serverUrl}/api/test?forceError=serverError`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
}, 60_000)
