import { describe, expect, it, vi } from 'vitest'

import { installMockNativeSync } from './setupNativeState'

vi.mock('../src/syncInstaller', () => ({ getSyncStateInstaller: () => null }))

// the native side of the factory contract: with no installer (iOS/Android
// without the OneNative TurboModule) there is no handle and no fallback.
describe('native sync factory without an installer', () => {
  it('throws instead of falling back to a JS cell', async () => {
    const key = '__OneNativeSyncState'
    const globals = globalThis as Record<string, unknown>
    const saved = globals[key]
    delete globals[key]
    try {
      const { createSyncState } = await import('../src/syncStore')
      expect(() => createSyncState('x')).toThrow(
        'useNativeState requires the OneNative native module'
      )
    } finally {
      if (saved !== undefined) globals[key] = saved
      else installMockNativeSync()
    }
  })
})
