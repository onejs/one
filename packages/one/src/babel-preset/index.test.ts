import path from 'node:path'
import { describe, expect, it } from 'vitest'
import oneBabelPreset from './index'

const projectRoot = path.resolve(__dirname, '../../')

const fakeApi = (cwd: string) => ({
  cache: () => {},
  cwd: () => cwd,
})

describe('one/babel-preset', () => {
  it('returns presets and plugins', () => {
    const result = oneBabelPreset(fakeApi(projectRoot), {
      projectRoot,
      // skip the babel-preset-expo lookup so this test runs without the
      // expo SDK installed in the workspace root
      includeExpoPreset: false,
    })

    expect(result).toHaveProperty('plugins')
    expect(Array.isArray(result.plugins)).toBe(true)
    expect(result.plugins).toHaveLength(5)
  })

  it('orders the plugin chain so server code is removed before router transforms', () => {
    const { plugins } = oneBabelPreset(fakeApi(projectRoot), {
      projectRoot,
      includeExpoPreset: false,
    })

    const names = (plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p))
    expect(names).toEqual([
      'one/babel-plugin-environment-guard',
      'one/babel-plugin-remove-server-code',
      'babel-plugin-module-resolver',
      'one/babel-plugin-one-router-metro',
      'one/babel-plugin-inline-one-server-url',
    ])
  })

  it('defaults routerRoot to "app"', () => {
    const { plugins } = oneBabelPreset(fakeApi(projectRoot), {
      projectRoot,
      includeExpoPreset: false,
    })

    const removeServer = (plugins ?? []).find(
      (p): p is [string, Record<string, unknown>] =>
        Array.isArray(p) && p[0] === 'one/babel-plugin-remove-server-code'
    )

    expect(removeServer?.[1].routerRoot).toBe('app')
  })

  it('threads custom routerRoot through', () => {
    const { plugins } = oneBabelPreset(fakeApi(projectRoot), {
      projectRoot,
      routerRoot: 'src/routes',
      includeExpoPreset: false,
    })

    const removeServer = (plugins ?? []).find(
      (p): p is [string, Record<string, unknown>] =>
        Array.isArray(p) && p[0] === 'one/babel-plugin-remove-server-code'
    )

    expect(removeServer?.[1].routerRoot).toBe('src/routes')
  })
})
