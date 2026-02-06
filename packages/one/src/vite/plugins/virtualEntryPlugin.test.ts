import { describe, expect, it, vi } from 'vitest'
import { createVirtualEntry } from './virtualEntryPlugin'

// mock isNativeEnvironment
vi.mock('vxrn', () => ({
  isNativeEnvironment: (env: any) => {
    return env?.name === 'ios' || env?.name === 'android'
  },
}))

vi.mock('@vxrn/compiler', () => ({
  configuration: { enableNativewind: false },
}))

function loadEntry(plugin: any, envName: string) {
  const ctx = {
    environment: { name: envName },
  }
  return plugin.load.call(ctx, '\0virtual:one-entry')
}

describe('virtualEntryPlugin', () => {
  describe('setupFile', () => {
    const base = {
      root: 'app',
      flags: {},
    }

    it('server (ssr) uses static import for setupFile', () => {
      const plugin = createVirtualEntry({
        ...base,
        setupFile: {
          client: './src/setupClient.ts',
          server: './src/setupServer.ts',
        },
      })
      const code = loadEntry(plugin, 'ssr')
      // should have a static import at the top
      expect(code).toContain('import "./src/setupServer.ts"')
      // should NOT have a dynamic import / getSetupPromise
      expect(code).not.toContain('__oneGetSetupPromise')
      expect(code).not.toContain('getSetupPromise')
    })

    it('client uses dynamic import for setupFile', () => {
      const plugin = createVirtualEntry({
        ...base,
        setupFile: {
          client: './src/setupClient.ts',
          server: './src/setupServer.ts',
        },
      })
      const code = loadEntry(plugin, 'client')
      // should have lazy dynamic import
      expect(code).toContain('__oneGetSetupPromise')
      expect(code).toContain('import(')
      expect(code).toContain('./src/setupClient.ts')
      expect(code).toContain('getSetupPromise: __oneGetSetupPromise')
      // should NOT have a static import
      expect(code).not.toContain('import "./src/setupClient.ts"')
    })

    it('native (ios) uses static import for setupFile', () => {
      const plugin = createVirtualEntry({
        ...base,
        setupFile: {
          client: './src/setupClient.ts',
          native: './src/setupNative.ts',
        },
      })
      const code = loadEntry(plugin, 'ios')
      expect(code).toContain('import "./src/setupNative.ts"')
      expect(code).not.toContain('__oneGetSetupPromise')
    })

    it('no setupFile produces no import', () => {
      const plugin = createVirtualEntry(base)
      const code = loadEntry(plugin, 'ssr')
      expect(code).not.toContain('setupServer')
      expect(code).not.toContain('__oneGetSetupPromise')
      expect(code).not.toContain('getSetupPromise')
    })

    it('string setupFile applies to all environments', () => {
      const plugin = createVirtualEntry({
        ...base,
        setupFile: './src/setup.ts',
      })
      const ssrCode = loadEntry(plugin, 'ssr')
      const clientCode = loadEntry(plugin, 'client')
      expect(ssrCode).toContain('import "./src/setup.ts"')
      expect(clientCode).toContain('./src/setup.ts')
      expect(clientCode).toContain('__oneGetSetupPromise')
    })
  })
})
