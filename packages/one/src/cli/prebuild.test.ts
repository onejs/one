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

const app = {
  name: 'MyApp',
  ios: { bundleId: 'dev.one.myapp' },
  android: { applicationId: 'dev.one.myapp' },
}

describe('one prebuild', () => {
  beforeEach(() => {
    loadUserOneOptionsMock.mockReset()
    prebuildMock.mockReset()
  })

  it('passes the loaded, validated native.app into vxrn', async () => {
    loadUserOneOptionsMock.mockResolvedValueOnce({ oneOptions: { native: { app } } })

    await run({ platform: 'ios', 'no-install': true })

    expect(loadUserOneOptionsMock).toHaveBeenCalledWith('build', true)
    expect(loadUserOneOptionsMock.mock.invocationCallOrder[0]).toBeLessThan(
      prebuildMock.mock.invocationCallOrder[0]
    )
    expect(prebuildMock).toHaveBeenCalledWith({
      root: process.cwd(),
      platform: 'ios',
      'no-install': true,
      app,
    })
  })

  it('rejects a missing native.app before calling vxrn', async () => {
    loadUserOneOptionsMock.mockResolvedValueOnce({ oneOptions: {} })

    await expect(run({ platform: 'ios' })).rejects.toThrow('native.app is required')
    expect(prebuildMock).not.toHaveBeenCalled()
  })

  it('rejects an invalid native.app before calling vxrn', async () => {
    loadUserOneOptionsMock.mockResolvedValueOnce({
      oneOptions: { native: { app: { name: 'my-app' } } },
    })

    await expect(run({ platform: 'ios' })).rejects.toThrow()
    expect(prebuildMock).not.toHaveBeenCalled()
  })

  it('does not prebuild when the app configuration fails to load', async () => {
    loadUserOneOptionsMock.mockRejectedValueOnce(new Error('invalid vite config'))

    await expect(run({ platform: 'ios' })).rejects.toThrow('invalid vite config')
    expect(prebuildMock).not.toHaveBeenCalled()
  })
})
