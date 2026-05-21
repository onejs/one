import path from 'node:path'
import { describe, expect, it } from 'vitest'
import oneBabelPreset, { buildOneBabelPlugins } from './index'

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
    // 5 One plugins + import-meta-env-plugin baked in for standalone Metro
    expect(result.plugins).toHaveLength(6)
  })

  it('orders the plugin chain so server code is removed before router transforms', () => {
    const { plugins } = oneBabelPreset(fakeApi(projectRoot), {
      projectRoot,
      includeExpoPreset: false,
    })

    const names = (plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p))
    expect(names).toEqual([
      '@vxrn/vite-plugin-metro/babel-plugins/import-meta-env-plugin',
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

  it('skips the One plugin chain when the Vite Metro caller already injected it', () => {
    const result = oneBabelPreset(
      {
        cache: () => {},
        cwd: () => projectRoot,
        caller: <T>(cb: (caller: unknown) => T): T =>
          cb({ oneViteMetroBabelConfig: true }),
      },
      {
        projectRoot,
        includeExpoPreset: false,
      }
    )

    expect(result.plugins).toEqual([])
  })
})

describe('buildOneBabelPlugins', () => {
  it('produces the canonical One plugin chain (no env plugin)', () => {
    const plugins = buildOneBabelPlugins({
      projectRoot,
      relativeRouterRoot: 'app',
      ignoredRouteFiles: [],
      linking: undefined,
      setupFile: undefined,
      // skip the import-meta-env plugin so the assertion covers the One-only chain
      includeImportMetaEnv: false,
    })

    expect(plugins).toHaveLength(5)
    expect(plugins[0]).toBe('one/babel-plugin-environment-guard')
    expect(plugins[1]).toEqual([
      'one/babel-plugin-remove-server-code',
      { routerRoot: 'app' },
    ])
    expect(plugins[2]).toMatchObject(['babel-plugin-module-resolver', { alias: {} }])

    const oneRouterMetro = plugins[3] as [string, Record<string, unknown>]
    expect(oneRouterMetro[0]).toBe('one/babel-plugin-one-router-metro')
    expect(oneRouterMetro[1]).toMatchObject({
      ONE_ROUTER_ROOT_FOLDER_NAME: 'app',
      ONE_ROUTER_LINKING_CONFIG: undefined,
      ONE_SETUP_FILE_NATIVE: undefined,
    })
    expect(typeof oneRouterMetro[1].ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY).toBe('string')
    expect(typeof oneRouterMetro[1].ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING).toBe(
      'string'
    )

    expect(plugins[4]).toBe('one/babel-plugin-inline-one-server-url')
  })

  it('threads setupFile through as a path relative to the metro entry', () => {
    const plugins = buildOneBabelPlugins({
      projectRoot,
      relativeRouterRoot: 'app',
      setupFile: 'src/setup-native.ts',
      includeImportMetaEnv: false,
    })

    const oneRouterMetro = plugins[3] as [string, Record<string, unknown>]
    expect(oneRouterMetro[1].ONE_SETUP_FILE_NATIVE).toMatch(/setup-native\.ts$/)
  })

  it('passes the linking config through', () => {
    const linking = { prefixes: ['myapp://'] }
    const plugins = buildOneBabelPlugins({
      projectRoot,
      relativeRouterRoot: 'app',
      linking,
      includeImportMetaEnv: false,
    })

    const oneRouterMetro = plugins[3] as [string, Record<string, unknown>]
    expect(oneRouterMetro[1].ONE_ROUTER_LINKING_CONFIG).toBe(linking)
  })

  // both values are inlined by babel as JS literals — `ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY`
  // becomes the first arg of `require.context()`, `ONE_SETUP_FILE_NATIVE` becomes the literal
  // in `import "..."`. Native separators on Windows produce platform-conditional AST that
  // breaks source-maps, snapshot tests, and rolldown/Vite POSIX module-graph keys.
  it('emits forward-slash-only paths for `require.context` + `import` specifiers', () => {
    const plugins = buildOneBabelPlugins({
      projectRoot,
      relativeRouterRoot: 'app',
      setupFile: 'src/setup-native.ts',
      includeImportMetaEnv: false,
    })

    const oneRouterMetro = plugins[3] as [string, Record<string, unknown>]
    const appRoot = oneRouterMetro[1].ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY as string
    const setupNative = oneRouterMetro[1].ONE_SETUP_FILE_NATIVE as string

    expect(appRoot).not.toContain('\\')
    expect(setupNative).not.toContain('\\')
  })
})
