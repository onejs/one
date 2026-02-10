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

    it('server (ssr) uses lazy dynamic import, not static import', () => {
      const plugin = createVirtualEntry({
        ...base,
        setupFile: {
          client: './src/setupClient.ts',
          server: './src/setupServer.ts',
        },
      })
      const code = loadEntry(plugin, 'ssr')
      // must NOT use static import (executes at build time)
      expect(code).not.toContain('import "./src/setupServer.ts"')
      // must use lazy function wrapping dynamic import
      expect(code).toContain('__oneGetSetupPromise = () => import(')
      expect(code).toContain('./src/setupServer.ts')
      // must pass it to createApp so it's called at render time
      expect(code).toContain('getSetupPromise: __oneGetSetupPromise')
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
      // native should NOT use lazy import or pass getSetupPromise
      expect(code).not.toContain('__oneGetSetupPromise')
      expect(code).not.toContain('getSetupPromise')
    })

    it('android uses static import like ios', () => {
      const plugin = createVirtualEntry({
        ...base,
        setupFile: {
          native: './src/setupNative.ts',
        },
      })
      const code = loadEntry(plugin, 'android')
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
      const iosCode = loadEntry(plugin, 'ios')
      // client and ssr both use lazy dynamic import
      expect(ssrCode).toContain('./src/setup.ts')
      expect(ssrCode).toContain('__oneGetSetupPromise')
      expect(ssrCode).not.toContain('import "./src/setup.ts"')
      expect(clientCode).toContain('./src/setup.ts')
      expect(clientCode).toContain('__oneGetSetupPromise')
      expect(clientCode).not.toContain('import "./src/setup.ts"')
      // native uses static import
      expect(iosCode).toContain('import "./src/setup.ts"')
      expect(iosCode).not.toContain('__oneGetSetupPromise')
    })
  })
})
