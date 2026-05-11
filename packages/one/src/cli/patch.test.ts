import { beforeEach, describe, expect, it, vi } from 'vitest'
import { run } from './patch'

const { patchMock, loadUserOneOptionsMock } = vi.hoisted(() => ({
  patchMock: vi.fn(),
  loadUserOneOptionsMock: vi.fn(),
}))

vi.mock('vxrn', () => ({
  patch: patchMock,
}))

vi.mock('../vite/loadConfig', () => ({
  loadUserOneOptions: loadUserOneOptionsMock,
}))

describe('one patch', () => {
  beforeEach(() => {
    patchMock.mockReset()
    loadUserOneOptionsMock.mockReset()
  })

  it('applies built-in patches when a native-only app has no vite config', async () => {
    loadUserOneOptionsMock.mockRejectedValueOnce(
      new Error('No config config in /tmp/native-only-app. Is this the correct directory?')
    )

    await run({})

    expect(patchMock).toHaveBeenCalledWith({
      root: process.cwd(),
      deps: undefined,
      force: undefined,
    })
  })

  it('passes configured user patches through to vxrn', async () => {
    const patches = {
      'example-package': {
        version: '1',
        'index.js': 'export default 1',
      },
    }
    loadUserOneOptionsMock.mockResolvedValueOnce({
      oneOptions: { patches },
    })

    await run({ force: true })

    expect(patchMock).toHaveBeenCalledWith({
      root: process.cwd(),
      deps: patches,
      force: true,
    })
  })

  it('keeps failing when a vite config exists but does not load one', async () => {
    loadUserOneOptionsMock.mockRejectedValueOnce(
      new Error('One not loaded properly, is the one() plugin in your vite.config.ts?')
    )

    await expect(run({})).rejects.toThrow('One not loaded properly')
    expect(patchMock).not.toHaveBeenCalled()
  })
})
