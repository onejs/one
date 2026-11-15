import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getViteMetroPluginOptions } from './getViteMetroPluginOptions'

/**
 * the vite-driven metro path must always inject one's required babel plugins.
 * a project babel.config can customize normal babel behavior, but it cannot be
 * the source of truth for one's router/server-code transforms because ordinary
 * react native configs do not know about them.
 */
describe('getViteMetroPluginOptions babel-config coexistence', () => {
  let tmpDir: string

  beforeAll(() => {
    // place the fixture under the workspace root so Node can walk up to
    // node_modules and resolve `one/metro-entry` + `@vxrn/utils/empty`
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

  it('explains the missing Metro plugin in an isolated app', () => {
    const isolatedApp = fs.mkdtempSync(path.join(os.tmpdir(), 'one-metro-no-preset-'))
    try {
      expect(() =>
        getViteMetroPluginOptions({
          projectRoot: isolatedApp,
          relativeRouterRoot: 'app',
        })
      ).toThrow(/Metro requires @vxrn\/vite-plugin-metro in the app.*Install with/)
    } finally {
      fs.rmSync(isolatedApp, { recursive: true, force: true })
    }
  })

  it('injects plugins when there is no user babel.config', () => {
    const opts = getViteMetroPluginOptions({
      projectRoot: tmpDir,
      relativeRouterRoot: 'app',
    })

    expect(opts?.babelConfig?.plugins).toBeDefined()
    expect(opts?.oneViteMetroBabelConfig).toBe(true)
    // 5 One plugins (Vite path skips import-meta-env-plugin since it's
    // injected separately via getMetroBabelConfigFromViteConfig)
    expect(opts?.babelConfig?.plugins?.length).toBe(5)
  })

  it('starts Metro in an isolated app without the Expo preset, a tsconfig or One dependencies of its own', () => {
    const isolatedApp = fs.mkdtempSync(path.join(os.tmpdir(), 'one-metro-no-expo-'))
    const workspaceRoot = path.resolve(__dirname, '../../../../')
    try {
      fs.writeFileSync(
        path.join(isolatedApp, 'package.json'),
        JSON.stringify({ name: 'tmp' })
      )
      for (const name of ['one', '@vxrn/vite-plugin-metro']) {
        const destination = path.join(isolatedApp, 'node_modules', name)
        fs.mkdirSync(path.dirname(destination), { recursive: true })
        fs.symlinkSync(path.join(workspaceRoot, 'node_modules', name), destination, 'dir')
      }
      for (const name of ['babel-preset-expo', '@vxrn/utils/empty']) {
        expect(() => createRequire(isolatedApp + '/').resolve(name)).toThrow()
      }
      const opts = getViteMetroPluginOptions({
        projectRoot: isolatedApp,
        relativeRouterRoot: 'app',
      })
      expect(opts.oneViteMetroBabelConfig).toBe(true)
      expect(opts.babelConfig?.plugins).toHaveLength(5)
    } finally {
      fs.rmSync(isolatedApp, { recursive: true, force: true })
    }
  })

  it('still injects One plugins when the user has a babel.config.cjs', () => {
    const cfgPath = path.join(tmpDir, 'babel.config.cjs')
    fs.writeFileSync(cfgPath, "module.exports = require('one/babel-preset')\n")

    try {
      const opts = getViteMetroPluginOptions({
        projectRoot: tmpDir,
        relativeRouterRoot: 'app',
      })

      expect(opts?.babelConfig?.plugins?.length).toBe(5)
    } finally {
      fs.unlinkSync(cfgPath)
    }
  })

  it('still injects One plugins when the user has a babel.config.js', () => {
    const cfgPath = path.join(tmpDir, 'babel.config.js')
    fs.writeFileSync(cfgPath, "module.exports = require('one/babel-preset')\n")

    try {
      const opts = getViteMetroPluginOptions({
        projectRoot: tmpDir,
        relativeRouterRoot: 'app',
      })

      expect(opts?.babelConfig?.plugins?.length).toBe(5)
    } finally {
      fs.unlinkSync(cfgPath)
    }
  })
})
