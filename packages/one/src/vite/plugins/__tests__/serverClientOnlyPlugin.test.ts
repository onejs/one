import { describe, it, expect } from 'vitest'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { serverClientOnlyPlugin } from '../serverClientOnlyPlugin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe('serverClientOnlyPlugin', () => {
  const plugin = serverClientOnlyPlugin()

  it('should have correct plugin name', () => {
    expect(plugin.name).toBe('one:server-client-only')
  })

  it('should enforce pre position', () => {
    expect(plugin.enforce).toBe('pre')
  })

  describe('config hook', () => {
    it('should provide aliases for server-only and client-only modules', () => {
      const config = plugin.config?.()
      
      expect(config).toEqual({
        resolve: {
          alias: {
            'server-only': resolve(__dirname, '../../server-only.js'),
            'client-only': resolve(__dirname, '../../client-only.js'),
          },
        },
      })
    })
  })

  describe('resolveId hook', () => {
    it('should resolve server-only module', () => {
      const result = plugin.resolveId?.('server-only', undefined, {})
      
      expect(result).toEqual({
        id: resolve(__dirname, '../../server-only.js'),
        external: false,
      })
    })

    it('should resolve client-only module', () => {
      const result = plugin.resolveId?.('client-only', undefined, {})
      
      expect(result).toEqual({
        id: resolve(__dirname, '../../client-only.js'),
        external: false,
      })
    })

    it('should return null for other modules', () => {
      const result = plugin.resolveId?.('some-other-module', undefined, {})
      
      expect(result).toBeNull()
    })
  })
})