import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { run } from './runIos'

const { loadUserOneOptionsMock, runIosMock, prebuildRunMock } = vi.hoisted(() => ({
  loadUserOneOptionsMock: vi.fn(),
  runIosMock: vi.fn(),
  prebuildRunMock: vi.fn(),
}))

vi.mock('../vite/loadConfig', () => ({
  loadUserOneOptions: loadUserOneOptionsMock,
}))

vi.mock('vxrn', () => ({
  runIos: runIosMock,
}))

vi.mock('./prebuild', () => ({
  run: prebuildRunMock,
}))

describe('one run:ios', () => {
  const originalCwd = process.cwd()
  let projectRoot: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'one-run-ios-'))
    writeFileSync(join(projectRoot, 'package.json'), '{"private":true}')
    process.chdir(projectRoot)
    loadUserOneOptionsMock.mockReset()
    runIosMock.mockReset()
    prebuildRunMock.mockReset()
    loadUserOneOptionsMock.mockResolvedValue({
      config: { config: { server: { port: 4300 } } },
    })
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('prebuilds the native project when ios/ is missing', async () => {
    await run({ udid: 'some-udid' })

    expect(prebuildRunMock).toHaveBeenCalledWith({ platform: 'ios' })
    expect(prebuildRunMock.mock.invocationCallOrder[0]).toBeLessThan(
      runIosMock.mock.invocationCallOrder[0]
    )
    expect(runIosMock).toHaveBeenCalledWith({
      root: process.cwd(),
      port: 4300,
      simulator: undefined,
      udid: 'some-udid',
    })
  })

  it('skips prebuild when ios/ already exists', async () => {
    mkdirSync(join(projectRoot, 'ios'))

    await run({ simulator: 'iPhone 16' })

    expect(prebuildRunMock).not.toHaveBeenCalled()
    expect(runIosMock).toHaveBeenCalledWith({
      root: process.cwd(),
      port: 4300,
      simulator: 'iPhone 16',
      udid: undefined,
    })
  })

  it('falls back to 8081 when the vite config fails to load', async () => {
    mkdirSync(join(projectRoot, 'ios'))
    loadUserOneOptionsMock.mockReset()
    loadUserOneOptionsMock.mockRejectedValue(new Error('no config'))

    await run({})

    expect(runIosMock).toHaveBeenCalledWith({
      root: process.cwd(),
      port: 8081,
      simulator: undefined,
      udid: undefined,
    })
  })

  it('exports the dev port for pod install before prebuilding', async () => {
    const previous = process.env.RCT_METRO_PORT
    delete process.env.RCT_METRO_PORT
    try {
      await run({})

      // pod install bakes this into the generated xcconfig
      expect(process.env.RCT_METRO_PORT).toBe('4300')
    } finally {
      if (previous === undefined) {
        delete process.env.RCT_METRO_PORT
      } else {
        process.env.RCT_METRO_PORT = previous
      }
    }
  })

  it('leaves an explicitly set metro port alone', async () => {
    const previous = process.env.RCT_METRO_PORT
    process.env.RCT_METRO_PORT = '9999'
    try {
      await run({})

      expect(process.env.RCT_METRO_PORT).toBe('9999')
    } finally {
      if (previous === undefined) {
        delete process.env.RCT_METRO_PORT
      } else {
        process.env.RCT_METRO_PORT = previous
      }
    }
  })
})
