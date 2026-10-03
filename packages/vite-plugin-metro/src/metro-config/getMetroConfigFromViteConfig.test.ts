import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { resolveConfig } from 'vite'
import type { ResolverConfigT } from 'metro-config'
import type { MetroPluginOptions } from '../plugins/metroPlugin'
import { afterAll, describe, expect, it } from 'vitest'
import {
  buildMetroConfigInputFromViteConfig,
  getMetroConfigFromViteConfig,
} from './getMetroConfigFromViteConfig'

const tmpDirs: string[] = []

describe('vite package dedupe through real metro bundles', () => {
  it.each([
    ['input', 'android'],
    ['input', 'ios'],
    ['full', 'android'],
    ['full', 'ios'],
  ])(
    'keeps one registration and native resolution for %s/%s',
    async (mode, platform) => {
      const workspaceRoot = path.resolve(__dirname, '../../../../')
      const scratch = path.join(workspaceRoot, 'scripts/tmp')
      fs.mkdirSync(scratch, { recursive: true })
      const fixtureRoot = fs.mkdtempSync(path.join(scratch, 'metro-dedupe-'))
      tmpDirs.push(fixtureRoot)
      fs.writeFileSync(path.join(fixtureRoot, 'package.json'), '{"private":true}')
      const writePackage = (directory: string, name: string, source: string) => {
        fs.mkdirSync(directory, { recursive: true })
        fs.writeFileSync(
          path.join(directory, 'package.json'),
          JSON.stringify({ name, version: '1.0.0', main: 'index.js' })
        )
        fs.writeFileSync(path.join(directory, 'index.js'), source)
      }
      const registry = (name: string) => `
globalThis.registrations = (globalThis.registrations || 0) + 1;
if (globalThis.registrations > 1) throw new Error('duplicate native view');
module.exports = ${JSON.stringify(name)};
`
      const rootRegistry = path.join(fixtureRoot, 'node_modules/@fixture/registry')
      writePackage(rootRegistry, '@fixture/registry', registry('root'))
      fs.writeFileSync(
        path.join(rootRegistry, 'package.json'),
        JSON.stringify({
          name: '@fixture/registry',
          version: '1.0.0',
          exports: {
            '.': { 'react-native': './index.js', default: './wrong.js' },
            './platform': './platform.js',
          },
        })
      )
      fs.writeFileSync(
        path.join(rootRegistry, 'wrong.js'),
        "throw new Error('native export condition lost');"
      )
      fs.writeFileSync(
        path.join(rootRegistry, 'platform.js'),
        "module.exports='export-subpath';"
      )
      const nativePackage = path.join(fixtureRoot, 'node_modules/@fixture/native')
      writePackage(nativePackage, '@fixture/native', "module.exports='wrong';")
      fs.writeFileSync(path.join(nativePackage, 'platform.js'), "module.exports='wrong';")
      for (const target of ['ios', 'android']) {
        fs.writeFileSync(
          path.join(nativePackage, `platform.${target}.js`),
          `module.exports=${JSON.stringify(target)};`
        )
      }
      writePackage(
        path.join(fixtureRoot, 'node_modules/@fixture/registry-extra'),
        '@fixture/registry-extra',
        "module.exports='wrong-root';"
      )
      writePackage(
        path.join(fixtureRoot, 'node_modules/plain'),
        'plain',
        "module.exports='root';"
      )
      for (const name of ['first', 'second']) {
        const directory = path.join(fixtureRoot, `node_modules/@fixture/${name}`)
        writePackage(
          directory,
          `@fixture/${name}`,
          `module.exports=[
require('@fixture/registry'), require('@fixture/registry/platform'), require('@fixture/native/platform'),
require('@fixture/registry-extra'), require('plain'), require('./local'), require('@fixture/alias')];`
        )
        fs.writeFileSync(
          path.join(directory, 'local.js'),
          `module.exports=${JSON.stringify(name)};`
        )
        writePackage(
          path.join(directory, 'node_modules/@fixture/native'),
          '@fixture/native',
          `module.exports=${JSON.stringify(name)};`
        )
        writePackage(
          path.join(directory, 'node_modules/@fixture/registry'),
          '@fixture/registry',
          registry(name)
        )
        writePackage(
          path.join(directory, 'node_modules/@fixture/registry-extra'),
          '@fixture/registry-extra',
          `module.exports=${JSON.stringify(name)};`
        )
        writePackage(
          path.join(directory, 'node_modules/plain'),
          'plain',
          `module.exports=${JSON.stringify(name)};`
        )
      }
      const alias = path.join(fixtureRoot, 'alias.js')
      fs.writeFileSync(alias, "module.exports='custom';")
      const resolver: Partial<ResolverConfigT> = {
        resolveRequest: (context, name, target) =>
          name === '@fixture/alias'
            ? { type: 'sourceFile', filePath: alias }
            : context.resolveRequest(context, name, target),
      }
      const viteConfig = await resolveConfig(
        {
          root: workspaceRoot,
          configFile: false,
          resolve: { dedupe: ['@fixture/registry', '@fixture/native', 'plain'] },
        },
        'build'
      )
      const options = {
        watchman: false,
        argv: { projectRoot: fixtureRoot },
        defaultConfigOverrides: (config) => ({
          resolver: { ...config?.resolver, ...resolver },
        }),
      } satisfies MetroPluginOptions
      const config =
        mode === 'input'
          ? (await buildMetroConfigInputFromViteConfig(viteConfig, options)).defaultConfig
          : await getMetroConfigFromViteConfig(viteConfig, options)
      const entry = path.join(fixtureRoot, 'entry.js')
      fs.writeFileSync(
        entry,
        "globalThis.values=[require('@fixture/first'),require('@fixture/second')];"
      )
      const require = createRequire(path.join(workspaceRoot, 'package.json'))
      const Server = require('metro/private/Server').default
      const output = require('metro/private/shared/output/bundle')
      const server = new Server({ ...config, maxWorkers: 1 })
      try {
        const bundle = await output.build(server, {
          entryFile: entry,
          platform,
          dev: false,
          minify: false,
        })
        const observed = { registrations: 0, values: [] }
        runInNewContext(bundle.code, observed)
        expect(observed.registrations).toBe(1)
        expect(observed.values).toEqual([
          ['root', 'export-subpath', platform, 'first', 'root', 'first', 'custom'],
          ['root', 'export-subpath', platform, 'second', 'root', 'second', 'custom'],
        ])
      } finally {
        await server.end()
      }
    },
    180_000
  )
})

afterAll(() => {
  for (const tmpDir of tmpDirs) {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})

describe('bare main module entry', () => {
  it('survives a resolver-replacing defaultConfigOverrides', async () => {
    const workspaceRoot = path.resolve(__dirname, '../../../../')
    const fixtureRoot = fs.mkdtempSync(path.join(workspaceRoot, '.tmp-metro-entry-'))
    tmpDirs.push(fixtureRoot)
    fs.writeFileSync(
      path.join(fixtureRoot, 'package.json'),
      JSON.stringify({ name: 'tmp-metro-entry', private: true })
    )

    const seen: string[] = []
    const { defaultConfig } = await buildMetroConfigInputFromViteConfig(
      { root: fixtureRoot } as any,
      {
        mainModuleName: 'one/metro-entry',
        watchman: false,
        defaultConfigOverrides: {
          resolver: {
            sourceExts: ['js'],
          },
        },
      } as any
    )

    expect((defaultConfig as any).watchFolders).toContain(workspaceRoot)
    expect((defaultConfig as any).resolver.nodeModulesPaths).toContain(
      path.join(workspaceRoot, 'node_modules')
    )

    const context = {
      originModulePath: `${fixtureRoot}/.`,
      resolveRequest: (_ctx: any, name: string) => {
        seen.push(name)
        return { type: 'sourceFile', filePath: name }
      },
    }
    await (defaultConfig as any).resolver.resolveRequest(
      context,
      './one/metro-entry',
      'ios'
    )
    expect(seen).toEqual(['one/metro-entry'])

    await (defaultConfig as any).resolver.resolveRequest(context, 'react-native', 'ios')
    expect(seen).toEqual(['one/metro-entry', 'react-native'])
  })
})

describe('watch exclusions', () => {
  it("block the app's build output but not a dependency's dist/server", async () => {
    const workspaceRoot = path.resolve(__dirname, '../../../../')
    const fixtureRoot = fs.mkdtempSync(path.join(workspaceRoot, '.tmp-metro-block-'))
    tmpDirs.push(fixtureRoot)
    fs.writeFileSync(
      path.join(fixtureRoot, 'package.json'),
      JSON.stringify({ name: 'tmp-metro-block', private: true })
    )

    const { defaultConfig } = await buildMetroConfigInputFromViteConfig(
      { root: fixtureRoot } as any,
      { watchman: false } as any
    )
    const blockList: RegExp[] = (defaultConfig as any).resolver.blockList
    const blocked = (file: string) => blockList.some((pattern) => pattern.test(file))

    expect(blocked(path.join(fixtureRoot, 'dist', 'server', 'entry.js'))).toBe(true)
    expect(blocked(path.join(fixtureRoot, 'dist', 'static', 'index.html'))).toBe(true)
    expect(
      blocked(
        path.join(
          fixtureRoot,
          'node_modules',
          '@o',
          'helpers',
          'dist',
          'server',
          'ensureEnv.js'
        )
      )
    ).toBe(false)
  })
})
