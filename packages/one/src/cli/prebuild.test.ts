import { beforeEach, describe, expect, it, vi } from 'vitest'
import { run } from './prebuild'

const { loadUserOneOptionsMock, prebuildMock } = vi.hoisted(() => ({
  loadUserOneOptionsMock: vi.fn(),
  prebuildMock: vi.fn(),
}))

vi.mock('../vite/loadConfig', () => ({
  loadUserOneOptions: loadUserOneOptionsMock,
}))

vi.mock('vxrn', () => ({
  prebuild: prebuildMock,
}))

describe('one prebuild', () => {
  beforeEach(() => {
    loadUserOneOptionsMock.mockReset()
    prebuildMock.mockReset()
  })

  it('loads the app bundler configuration before native prebuild', async () => {
    loadUserOneOptionsMock.mockResolvedValueOnce({})

    await run({ platform: 'ios', expo: true, 'no-install': true })

    expect(loadUserOneOptionsMock).toHaveBeenCalledWith('build', true)
    expect(loadUserOneOptionsMock.mock.invocationCallOrder[0]).toBeLessThan(
      prebuildMock.mock.invocationCallOrder[0]
    )
    expect(prebuildMock).toHaveBeenCalledWith({
      root: process.cwd(),
      platform: 'ios',
      expo: true,
      'no-install': true,
    })
  })

  it('does not prebuild when the app configuration fails to load', async () => {
    loadUserOneOptionsMock.mockRejectedValueOnce(new Error('invalid vite config'))

    await expect(run({ platform: 'ios', expo: true })).rejects.toThrow(
      'invalid vite config'
    )
    expect(prebuildMock).not.toHaveBeenCalled()
  })
})
