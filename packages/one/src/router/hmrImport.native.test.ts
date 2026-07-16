import { afterEach, describe, expect, it, vi } from 'vitest'
import { hmrImport } from './hmrImport.native'

const realRuntime = (globalThis as any).__rolldown_runtime__
afterEach(() => {
  ;(globalThis as any).__rolldown_runtime__ = realRuntime
  vi.restoreAllMocks()
})
const setRuntime = (runtime: unknown) => {
  ;(globalThis as any).__rolldown_runtime__ = runtime
}

describe('hmrImport (native)', () => {
  it('rejects when no runtime is present', async () => {
    setRuntime(undefined)
    await expect(hmrImport('foo.tsx')).rejects.toThrow(
      'HMR import not supported on native'
    )
  })

  it('rejects when loadExports is missing', async () => {
    setRuntime({})
    await expect(hmrImport('foo.tsx')).rejects.toThrow(
      'HMR import not supported on native'
    )
  })

  it('resolves with the runtime exports and strips ./ and / prefixes', async () => {
    const exports = { default: () => null }
    const loadExports = vi.fn(() => exports)
    setRuntime({ loadExports })

    await expect(hmrImport('./foo.tsx')).resolves.toBe(exports)
    await expect(hmrImport('/foo.tsx')).resolves.toBe(exports)
    await expect(hmrImport('foo.tsx')).resolves.toBe(exports)
    expect(loadExports).toHaveBeenNthCalledWith(1, 'foo.tsx')
    expect(loadExports).toHaveBeenNthCalledWith(2, 'foo.tsx')
    expect(loadExports).toHaveBeenNthCalledWith(3, 'foo.tsx')
  })

  it('rejects when loadExports returns null', async () => {
    setRuntime({ loadExports: () => null })
    await expect(hmrImport('foo.tsx')).rejects.toThrow('no exports for foo.tsx')
  })

  it('rejects when loadExports throws', async () => {
    const boom = new Error('boom')
    setRuntime({
      loadExports: () => {
        throw boom
      },
    })
    await expect(hmrImport('foo.tsx')).rejects.toBe(boom)
  })
})
