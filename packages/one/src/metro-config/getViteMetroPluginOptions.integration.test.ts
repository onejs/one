import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getViteMetroPluginOptions } from './getViteMetroPluginOptions'

/**
 * The Vite-driven Metro path injects babel plugins through Metro's
 * customTransformOptions. If a user adds their own `babel.config.*` in
 * the project root, those plugins would apply a second time (once via
 * our injection, once via Metro's babelrc lookup), so the chain would
 * fire on every file twice.
 *
 * The fix: detect a user babel config and emit an empty plugin list,
 * deferring to the user's config. They are expected to delegate to
 * `one/babel-preset`.
 */
describe('getViteMetroPluginOptions babel-config detection', () => {
  let tmpDir: string

  beforeAll(() => {
    // place the fixture under the workspace root so Node can walk up to
    // node_modules and resolve `one/metro-entry` + `@vxrn/vite-plugin-metro/empty`
    const workspaceRoot = path.resolve(__dirname, '../../../../')
    tmpDir = fs.mkdtempSync(path.join(workspaceRoot, '.tmp-one-vite-metro-test-'))
    fs.writeFileSync(
      path.join(tmpDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { paths: {} } })
    )
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'tmp' }))
  })

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('injects plugins when there is no user babel.config', () => {
    const opts = getViteMetroPluginOptions({
      projectRoot: tmpDir,
      relativeRouterRoot: 'app',
    })

    expect(opts?.babelConfig?.plugins).toBeDefined()
    // 5 One plugins (Vite path skips import-meta-env-plugin since it's
    // injected separately via getMetroBabelConfigFromViteConfig)
    expect(opts?.babelConfig?.plugins?.length).toBe(5)
  })

  it('skips plugin injection when the user has a babel.config.cjs', () => {
    const cfgPath = path.join(tmpDir, 'babel.config.cjs')
    fs.writeFileSync(cfgPath, "module.exports = require('one/babel-preset')\n")

    try {
      const opts = getViteMetroPluginOptions({
        projectRoot: tmpDir,
        relativeRouterRoot: 'app',
      })

      expect(opts?.babelConfig?.plugins).toEqual([])
    } finally {
      fs.unlinkSync(cfgPath)
    }
  })

  it('skips plugin injection when the user has a babel.config.js', () => {
    const cfgPath = path.join(tmpDir, 'babel.config.js')
    fs.writeFileSync(cfgPath, "module.exports = require('one/babel-preset')\n")

    try {
      const opts = getViteMetroPluginOptions({
        projectRoot: tmpDir,
        relativeRouterRoot: 'app',
      })

      expect(opts?.babelConfig?.plugins).toEqual([])
    } finally {
      fs.unlinkSync(cfgPath)
    }
  })
})
