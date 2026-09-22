import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import oneBabelPreset, { buildOneBabelPlugins } from './index'

const projectRoot = path.resolve(__dirname, '../../')

const fakeApi = (cwd: string) => ({
  cache: () => {},
  cwd: () => cwd,
})

describe('one/babel-preset', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns presets and plugins', () => {
    const result = oneBabelPreset(fakeApi(projectRoot), { projectRoot })

    expect(result).toHaveProperty('plugins')
    expect(Array.isArray(result.plugins)).toBe(true)
    // 5 One plugins + import-meta-env-plugin baked in for standalone Metro
    expect(result.plugins).toHaveLength(6)
    // @react-native/babel-preset base for TS/Flow syntax + platform transforms
    expect(result.presets).toHaveLength(1)
  })

  it('orders the plugin chain so server code is removed before router transforms', () => {
    const { plugins } = oneBabelPreset(fakeApi(projectRoot), {
      projectRoot,
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
      }
    )

    expect(result.plugins).toEqual([])
    // the one dev path still needs the RN base: the Vite plugin only
    // injected the One chain, not syntax transforms
    expect(result.presets).toHaveLength(1)
  })

  it('adds nothing when @vxrn/compiler applies it inside the vite and rolldown pipeline', () => {
    const result = oneBabelPreset(
      {
        cache: () => {},
        cwd: () => projectRoot,
        caller: <T>(cb: (caller: unknown) => T): T => cb({ name: 'vxrn' }),
      },
      { projectRoot }
    )

    expect(result).toEqual({ presets: [], plugins: [] })
  })

  it('builds the standalone Metro environment with one-way Expo aliases', () => {
    vi.stubEnv('ONE_PUBLIC_FROM_ONE', 'one')
    vi.stubEnv('ONE_PUBLIC_CONFLICT', 'one-conflict')
    vi.stubEnv('EXPO_PUBLIC_CONFLICT', 'expo-conflict')
    vi.stubEnv('EXPO_PUBLIC_EXPO_ONLY', 'expo-only')
    vi.stubEnv('ONE_PLATFORM', 'web')
    vi.stubEnv('EXPO_OS', 'web')

    const webResult = oneBabelPreset(fakeApi(projectRoot), {
      projectRoot,
    })

    expect(webResult.plugins?.[0]).toEqual([
      '@vxrn/vite-plugin-metro/babel-plugins/import-meta-env-plugin',
      {
        env: expect.objectContaining({
          ONE_PUBLIC_FROM_ONE: 'one',
          EXPO_PUBLIC_FROM_ONE: 'one',
          ONE_PUBLIC_CONFLICT: 'one-conflict',
          EXPO_PUBLIC_CONFLICT: 'expo-conflict',
          EXPO_PUBLIC_EXPO_ONLY: 'expo-only',
          ONE_PLATFORM: 'web',
        }),
      },
    ])
    expect(webResult.plugins?.[0]).not.toHaveProperty('1.env.ONE_PUBLIC_EXPO_ONLY')
    expect(webResult.plugins?.[0]).not.toHaveProperty('1.env.EXPO_OS')

    vi.stubEnv('ONE_PLATFORM', 'ios')
    const iosResult = oneBabelPreset(fakeApi(projectRoot), {
      projectRoot,
    })
    expect(iosResult.plugins?.[0]).toHaveProperty('1.env.EXPO_OS', 'ios')

    vi.stubEnv('ONE_PLATFORM', 'android')
    const androidResult = oneBabelPreset(fakeApi(projectRoot), {
      projectRoot,
    })
    expect(androidResult.plugins?.[0]).toHaveProperty('1.env.EXPO_OS', 'android')
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
