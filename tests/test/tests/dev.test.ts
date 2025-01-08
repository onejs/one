import { describe, expect, it, inject } from 'vitest'
import { ONLY_TEST_PROD } from '../../../packages/one/test/_constants'

describe('Simple Run Tests', () => {
  if (ONLY_TEST_PROD) {
    it('should pass', () => {
      expect(true).toBeTruthy()
    })
    return
  }

  const testInfo = inject('testInfo')
  const serverUrl = `http://localhost:${testInfo.testDevPort}`

  it('should have a valid server URL', () => {
    expect(serverUrl).toBeDefined()
    expect(serverUrl).toContain('http://localhost')
  })

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
})
