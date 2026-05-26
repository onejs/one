import { describe, expect, it, vi } from 'vitest'
import { isChunkLoadError, loadWithRetry } from './dynamicImport'

const instantDelay = () => Promise.resolve()
const chunkError = () =>
  new Error('Failed to fetch dynamically imported module: /assets/EditorPane.js')

// let the all-microtask retry chain (instantDelay resolves synchronously) plus
// the final pending-promise branch fully drain before asserting.
const drain = () => new Promise((r) => setTimeout(r, 0))

describe('isChunkLoadError', () => {
  it('matches the chrome / firefox / safari chunk-load messages, nothing else', () => {
    expect(
      isChunkLoadError(new Error('Failed to fetch dynamically imported module: /a'))
    ).toBe(true)
    expect(
      isChunkLoadError(new Error('error loading dynamically imported module: /a'))
    ).toBe(true)
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(true)
    expect(isChunkLoadError(new Error('TypeError: x is not a function'))).toBe(false)
  })
})

describe('loadWithRetry', () => {
  it('resolves on first success without retrying or recovering', async () => {
    const loader = vi.fn().mockResolvedValue({ default: 'ok' })
    const delay = vi.fn(instantDelay)
    const onChunkErrorExhausted = vi.fn(() => false)
    await expect(
      loadWithRetry(loader, { delay, onChunkErrorExhausted })
    ).resolves.toEqual({
      default: 'ok',
    })
    expect(loader).toHaveBeenCalledTimes(1)
    expect(delay).not.toHaveBeenCalled()
    expect(onChunkErrorExhausted).not.toHaveBeenCalled()
  })

  it('retries a transient rejection then resolves, re-invoking the loader each attempt', async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(chunkError())
      .mockRejectedValueOnce(chunkError())
      .mockResolvedValue({ default: 'ok' })
    const delay = vi.fn(instantDelay)
    const onChunkErrorExhausted = vi.fn(() => false)
    await expect(
      loadWithRetry(loader, { attempts: 3, delay, onChunkErrorExhausted })
    ).resolves.toEqual({ default: 'ok' })
    expect(loader).toHaveBeenCalledTimes(3)
    expect(delay).toHaveBeenCalledTimes(2)
    expect(onChunkErrorExhausted).not.toHaveBeenCalled()
  })

  it('exhausts retries on a persistent chunk error, recovers once, and stays pending', async () => {
    const loader = vi.fn().mockRejectedValue(chunkError())
    const delay = vi.fn(instantDelay)
    const onChunkErrorExhausted = vi.fn(() => true) // a reload was scheduled
    const settled = vi.fn()
    void loadWithRetry(loader, { attempts: 2, delay, onChunkErrorExhausted }).then(
      settled,
      settled
    )
    await drain()
    expect(loader).toHaveBeenCalledTimes(3) // initial + 2 retries
    expect(onChunkErrorExhausted).toHaveBeenCalledTimes(1)
    // the page is tearing down for the reload — the promise must never settle so
    // it can't flash a broken/blank tree.
    expect(settled).not.toHaveBeenCalled()
  })

  it('rethrows a non-chunk error without recovering', async () => {
    const loader = vi.fn().mockRejectedValue(new Error('boom: a real bug'))
    const delay = vi.fn(instantDelay)
    const onChunkErrorExhausted = vi.fn(() => true)
    await expect(
      loadWithRetry(loader, { attempts: 1, delay, onChunkErrorExhausted })
    ).rejects.toThrow('boom: a real bug')
    expect(loader).toHaveBeenCalledTimes(2)
    expect(onChunkErrorExhausted).not.toHaveBeenCalled()
  })

  it('rethrows a chunk error when the reload was debounced away', async () => {
    const loader = vi.fn().mockRejectedValue(chunkError())
    const delay = vi.fn(instantDelay)
    const onChunkErrorExhausted = vi.fn(() => false) // debounced, no reload happened
    await expect(
      loadWithRetry(loader, { attempts: 1, delay, onChunkErrorExhausted })
    ).rejects.toThrow('Failed to fetch dynamically imported module')
    expect(onChunkErrorExhausted).toHaveBeenCalledTimes(1)
  })
})
