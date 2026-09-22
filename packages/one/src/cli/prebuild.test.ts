import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  const originalCwd = process.cwd()
  let projectRoot: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'one-prebuild-'))
    writeFileSync(join(projectRoot, 'package.json'), '{"private":true}')
    process.chdir(projectRoot)
    loadUserOneOptionsMock.mockReset()
    prebuildMock.mockReset()
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(projectRoot, { recursive: true, force: true })
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

  it('writes the release-bundle react-native config', async () => {
    loadUserOneOptionsMock.mockResolvedValueOnce({ oneOptions: { native: { app } } })

    await run({ platform: 'ios', 'no-install': true })

    expect(readFileSync(join(projectRoot, 'react-native.config.cjs'), 'utf8')).toBe(
      `module.exports = require('one/react-native-config')\n`
    )
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

  it('ignores an undeclared expo-modules-core hoisted into node_modules', async () => {
    const expoModulesCore = join(projectRoot, 'node_modules', 'expo-modules-core')
    mkdirSync(expoModulesCore, { recursive: true })
    writeFileSync(
      join(expoModulesCore, 'package.json'),
      '{"name":"expo-modules-core","version":"1.0.0"}'
    )
    loadUserOneOptionsMock.mockResolvedValueOnce({ oneOptions: { native: { app } } })

    await run({ platform: 'ios' })

    expect(prebuildMock).toHaveBeenCalledWith({
      root: process.cwd(),
      platform: 'ios',
      app,
    })
  })

  it.each(['dependencies', 'devDependencies'])(
    'directs apps declaring Expo in %s to Expo prebuild before loading One config',
    async (dependencyType) => {
      writeFileSync(
        join(projectRoot, 'package.json'),
        JSON.stringify({ private: true, [dependencyType]: { expo: '^54.0.0' } })
      )

      await expect(run({ platform: 'ios' })).rejects.toThrow(
        'run Expo prebuild and list "vxrn/expo-plugin" in the Expo config'
      )
      expect(loadUserOneOptionsMock).not.toHaveBeenCalled()
      expect(prebuildMock).not.toHaveBeenCalled()
    }
  )
})
