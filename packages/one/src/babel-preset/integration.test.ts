import path from 'node:path'
import { transformSync } from '@babel/core'
import { describe, expect, it } from 'vitest'
import oneBabelPreset, { buildOneBabelPlugins } from './index'

const projectRoot = path.resolve(__dirname, '../../')

/**
 * Integration test: end-to-end load oneBabelPreset through @babel/core and
 * run it against representative One sources. Catches breakage in:
 *   - plugin specifier resolution (each `'one/babel-plugin-*'` must resolve)
 *   - plugin option shape (each plugin gets a valid config)
 *   - chain ordering (plugins compose without conflicts)
 *
 * Per-plugin semantic tests live alongside each plugin file. This file only
 * verifies that the preset wires them up correctly.
 */
describe('one/babel-preset integration', () => {
  // wiring tests run the One chain directly so assertions see untransformed
  // modules; syntax tests below run the full preset with its RN base.
  const onePlugins = buildOneBabelPlugins({ projectRoot, relativeRouterRoot: 'app' })
  const presetWithBase = [oneBabelPreset, { projectRoot }] as const

  // caller the Metro babel transformer sets on the `one dev` path, where the
  // Vite plugin already injected the One chain via customTransformOptions.
  const metroViteCaller = {
    name: 'metro',
    bundler: 'metro',
    platform: 'ios',
    projectRoot,
    oneViteMetroBabelConfig: true,
  }

  it('runs against a route file without throwing', () => {
    const code = `
      import { useLoader } from 'one'
      export default function Page() {
        return null
      }
    `
    const result = transformSync(code, {
      filename: path.join(projectRoot, 'app/index.tsx'),
      cwd: projectRoot,
      plugins: onePlugins,
      parserOpts: { sourceType: 'module', plugins: ['jsx'] },
    })

    expect(result?.code).toBeTruthy()
    // module-resolver should turn 'one' into a relative path under this
    // package because tsconfig.base.json has `one` aliased to packages/one
    // No assertion on the exact path — but it must still mention 'useLoader'
    expect(result?.code).toContain('useLoader')
  })

  it('substitutes ONE_ROUTER_* process.env placeholders in metro-entry', () => {
    // metro-entry-ctx.js uses process.env.ONE_ROUTER_* as placeholders that
    // one-router-metro replaces with the configured values at bundle time.
    const code = `
      const ctx = require.context(
        process.env.ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY,
        true,
        process.env.ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING
      )
      const folder = process.env.ONE_ROUTER_ROOT_FOLDER_NAME
      module.exports = { ctx, folder }
    `
    const result = transformSync(code, {
      filename: path.join(projectRoot, 'metro-entry-ctx.js'),
      cwd: projectRoot,
      plugins: onePlugins,
      parserOpts: { sourceType: 'module' },
    })

    expect(result?.code).toBeTruthy()
    // placeholders must be replaced
    expect(result?.code).not.toContain(
      'process.env.ONE_ROUTER_APP_ROOT_RELATIVE_TO_ENTRY'
    )
    expect(result?.code).not.toContain('process.env.ONE_ROUTER_ROOT_FOLDER_NAME')
    expect(result?.code).not.toContain(
      'process.env.ONE_ROUTER_REQUIRE_CONTEXT_REGEX_STRING'
    )
    // routerRoot should be inlined as 'app'
    expect(result?.code).toContain('"app"')
    // require-context regex should be inlined as a regex literal
    expect(result?.code).toMatch(/\/\^.*\.tsx\?\$\//)
  })

  it('keeps client code intact in non-route files', () => {
    const code = `
      const x = 1
      export default x
    `
    const result = transformSync(code, {
      filename: path.join(projectRoot, 'src/utils/x.ts'),
      cwd: projectRoot,
      plugins: onePlugins,
      parserOpts: { sourceType: 'module' },
    })

    expect(result?.code).toContain('const x = 1')
  })

  it('strips `import type` on the one dev Metro path', () => {
    // every route file is TS. with no base preset Metro dies with
    // `TransformError: Unexpected token, expected "from"` on this line.
    const code = `
      import { Tabs } from 'one'
      import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs'
      export default function Layout() {
        return null
      }
    `
    const result = transformSync(code, {
      filename: path.join(projectRoot, 'app/(tabs)/_layout.tsx'),
      cwd: projectRoot,
      presets: [presetWithBase],
      caller: metroViteCaller,
    })

    expect(result?.code).toBeTruthy()
    expect(result?.code).not.toContain('import type')
    expect(result?.code).toContain('Layout')
  })

  it('strips flow `import typeof` on the one dev Metro path', () => {
    // react-native/index.js ships `import typeof ... from './index.js.flow'`.
    // unstripped, Metro tries to resolve the .flow file and the iOS bundle
    // 500s with UnableToResolveError.
    const code = `import typeof * as ReactNativePublicAPI from './index.js.flow'
const x = 1
module.exports = x
`
    const result = transformSync(code, {
      filename: path.join(projectRoot, 'node_modules/react-native/index.js'),
      cwd: projectRoot,
      presets: [presetWithBase],
      caller: metroViteCaller,
    })

    expect(result?.code).toBeTruthy()
    expect(result?.code).not.toContain('index.js.flow')
  })

  it('tolerates the composed form listing the RN preset twice', () => {
    // configs scaffolded while one/babel-preset carried no base list
    // @react-native/babel-preset themselves. the preset including its own
    // base must not break them: transforms stay idempotent.
    const code = `
      import type { X } from './types'
      export const x: X = 1
    `
    const result = transformSync(code, {
      filename: path.join(projectRoot, 'src/utils/y.ts'),
      cwd: projectRoot,
      presets: [require.resolve('@react-native/babel-preset'), presetWithBase],
      caller: metroViteCaller,
    })

    expect(result?.code).toBeTruthy()
    expect(result?.code).not.toContain('import type')
  })
})
