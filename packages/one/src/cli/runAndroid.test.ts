import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { run } from './runAndroid'

const { loadUserOneOptionsMock, runAndroidMock, prebuildRunMock } = vi.hoisted(
  () => ({
    loadUserOneOptionsMock: vi.fn(),
    runAndroidMock: vi.fn(),
    prebuildRunMock: vi.fn(),
  })
)

vi.mock('../vite/loadConfig', () => ({
  loadUserOneOptions: loadUserOneOptionsMock,
}))

vi.mock('vxrn', () => ({
  runAndroid: runAndroidMock,
}))

vi.mock('./prebuild', () => ({
  run: prebuildRunMock,
}))

describe('one run:android', () => {
  const originalCwd = process.cwd()
  let projectRoot: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'one-run-android-'))
    writeFileSync(join(projectRoot, 'package.json'), '{"private":true}')
    process.chdir(projectRoot)
    loadUserOneOptionsMock.mockReset()
    runAndroidMock.mockReset()
    prebuildRunMock.mockReset()
    loadUserOneOptionsMock.mockResolvedValue({
      config: { config: { server: { port: 4300 } } },
    })
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('prebuilds the native project when android/ is missing', async () => {
    await run({})

    expect(prebuildRunMock).toHaveBeenCalledWith({ platform: 'android' })
    expect(prebuildRunMock.mock.invocationCallOrder[0]).toBeLessThan(
      runAndroidMock.mock.invocationCallOrder[0]
    )
    expect(runAndroidMock).toHaveBeenCalledWith({
      root: process.cwd(),
      port: 4300,
    })
  })

  it('skips prebuild when android/ already exists', async () => {
    mkdirSync(join(projectRoot, 'android'))

    await run({})

    expect(prebuildRunMock).not.toHaveBeenCalled()
    expect(runAndroidMock).toHaveBeenCalledWith({
      root: process.cwd(),
      port: 4300,
    })
  })
})
