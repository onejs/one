import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const rolldownState = vi.hoisted(() => ({
  firstBuildError: new Error('first native build failed'),
}))

vi.mock('rolldown/experimental', () => ({
  viteImportGlobPlugin: () => ({ name: 'test:import-glob' }),
  dev: async (
    _input: unknown,
    _output: unknown,
    callbacks: { onOutput: (result: Error) => Promise<void> }
  ) => ({
    async run() {
      await callbacks.onOutput(rolldownState.firstBuildError)
    },
    async ensureLatestBuildOutput() {},
    async close() {},
  }),
}))

import { createNativeDevEngine } from './createNativeDevEngine'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('createNativeDevEngine initial build failure', () => {
  it('rejects the bundle request immediately with the Rolldown error', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // the engine keys its route registry by the real app root, so it must exist.
    const root = mkdtempSync(join(tmpdir(), 'vxrn-native-build-error-'))
    const engine = await createNativeDevEngine({
      root,
      port: 4400,
      platform: 'ios',
    })

    let settled = false
    const bundleResult = engine.getBundle().then(
      () => new Error('bundle request unexpectedly resolved'),
      (error) => {
        settled = true
        return error
      }
    )

    await vi.advanceTimersByTimeAsync(0)
    const settledBeforeTimeout = settled
    await vi.advanceTimersByTimeAsync(120_000)

    expect(settledBeforeTimeout).toBe(true)
    expect(await bundleResult).toBe(rolldownState.firstBuildError)
    await engine.close()
    rmSync(root, { recursive: true, force: true })
  })
})
