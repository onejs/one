import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildOneBabelPlugins } from './buildOneBabelPlugins'

// use this package's own root as a stand-in project: it has a tsconfig.json
// with `paths`, so the plugin chain can compute aliases. This also matches
// how the function is consumed for the snapshot regression — if any of the
// inputs that downstream consumers depend on change shape, this snapshot
// surfaces it.
const projectRoot = path.resolve(__dirname, '../../')

describe('buildOneBabelPlugins', () => {
  it('produces the canonical One babel plugin chain', () => {
    const plugins = buildOneBabelPlugins({
      projectRoot,
      relativeRouterRoot: 'app',
      ignoredRouteFiles: [],
      linking: undefined,
      setupFile: undefined,
    })

    // expected shape — five plugins in this exact order so Vite-driven
    // Metro and user-land babel.config.cjs produce the same bundle.
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
    expect(typeof oneRouterMetro[1].ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY).toBe(
      'string'
    )
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
    })

    const oneRouterMetro = plugins[3] as [string, Record<string, unknown>]
    expect(oneRouterMetro[1].ONE_ROUTER_LINKING_CONFIG).toBe(linking)
  })
})
