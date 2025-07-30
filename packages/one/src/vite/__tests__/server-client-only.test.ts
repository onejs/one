import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('server-only module', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.VITE_ENVIRONMENT
    vi.resetModules()
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.VITE_ENVIRONMENT = originalEnv
    } else {
      delete process.env.VITE_ENVIRONMENT
    }
  })

  it('should throw an error when imported in client environment', async () => {
    process.env.VITE_ENVIRONMENT = 'client'
    
    await expect(async () => {
      await import('../server-only')
    }).rejects.toThrow('This file should only be imported on the server! Current environment: client')
  })

  it('should not throw when imported in ssr environment', async () => {
    process.env.VITE_ENVIRONMENT = 'ssr'
    
    await expect(import('../server-only')).resolves.not.toThrow()
  })

  it('should throw when VITE_ENVIRONMENT is not set', async () => {
    delete process.env.VITE_ENVIRONMENT
    
    await expect(async () => {
      await import('../server-only')
    }).rejects.toThrow('This file should only be imported on the server! Current environment: undefined')
  })
})

describe('client-only module', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.VITE_ENVIRONMENT
    vi.resetModules()
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.VITE_ENVIRONMENT = originalEnv
    } else {
      delete process.env.VITE_ENVIRONMENT
    }
  })

  it('should throw an error when imported in ssr environment', async () => {
    process.env.VITE_ENVIRONMENT = 'ssr'
    
    await expect(async () => {
      await import('../client-only')
    }).rejects.toThrow('This file should only be imported on the client! Current environment: ssr')
  })

  it('should not throw when imported in client environment', async () => {
    process.env.VITE_ENVIRONMENT = 'client'
    
    await expect(import('../client-only')).resolves.not.toThrow()
  })

  it('should throw when VITE_ENVIRONMENT is not set', async () => {
    delete process.env.VITE_ENVIRONMENT
    
    await expect(async () => {
      await import('../client-only')
    }).rejects.toThrow('This file should only be imported on the client! Current environment: undefined')
  })
})