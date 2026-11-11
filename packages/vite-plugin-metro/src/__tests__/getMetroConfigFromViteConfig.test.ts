import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { resolveConfig } from 'vite'
import type { ResolverConfigT } from 'metro-config'
import type { MetroPluginOptions } from '../plugins/metroPlugin'
import { afterAll, describe, expect, it } from 'vitest'
import { dedupe } from '../../../vxrn/src/config/getBaseViteConfigOnly'
import {
  buildMetroConfigInputFromViteConfig,
  getMetroConfigFromViteConfig,
} from '../metro-config/getMetroConfigFromViteConfig'

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
require('@fixture/registry-extra'), require('plain'), require('./local'), require('@fixture/alias'), require('escape-string-regexp')];`
        )
        writePackage(
          path.join(directory, 'node_modules/escape-string-regexp'),
          'escape-string-regexp',
          `module.exports=${JSON.stringify(name + '-utility')};`
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
          resolve: { dedupe: [...dedupe, '@fixture/registry', '@fixture/native', 'plain'] },
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
      const require = createRequire(path.join(workspaceRoot, 'package.json'))
      const { loadConfig } = require('metro-config')
      const config =
        mode === 'input'
          ? await loadConfig(
              { cwd: fixtureRoot, projectRoot: fixtureRoot },
              (await buildMetroConfigInputFromViteConfig(viteConfig, options)).defaultConfig
            )
          : await getMetroConfigFromViteConfig(viteConfig, options)
      const entry = path.join(fixtureRoot, 'entry.js')
      fs.writeFileSync(
        entry,
        "globalThis.values=[require('@fixture/first'),require('@fixture/second')];"
      )
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
          ['root', 'export-subpath', platform, 'first', 'root', 'first', 'custom', 'first-utility'],
          ['root', 'export-subpath', platform, 'second', 'root', 'second', 'custom', 'second-utility'],
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

    expect((defaultConfig as any).watchFolders).not.toContain(workspaceRoot)
    expect((defaultConfig as any).watchFolders).toContain(
      path.join(workspaceRoot, 'node_modules')
    )
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

describe('workspace visibility', () => {
  it.each(['array', 'object', 'pnpm', 'recursive'])(
    'watches workspace packages from %s globs without exposing build output',
    async (kind) => {
      const scratch = path.join(os.homedir(), '.scratch', 'metro-workspace-visibility')
      fs.mkdirSync(scratch, { recursive: true })
      const workspaceRoot = fs.mkdtempSync(path.join(scratch, 'fixture-'))
      tmpDirs.push(workspaceRoot)
      const projectRoot = path.join(workspaceRoot, 'app')
      const shared = path.join(workspaceRoot, 'packages/shared')
      const custom = path.join(workspaceRoot, 'custom')
      const modules = path.join(workspaceRoot, 'node_modules')
      const installedModules = path.resolve(__dirname, '../../../../node_modules')
      const globs = ['app', kind === 'recursive' ? 'packages/**' : 'packages/*']
      fs.writeFileSync(
        path.join(workspaceRoot, 'package.json'),
        JSON.stringify({
          private: true,
          workspaces:
            kind === 'pnpm'
              ? ['wrong/*']
              : kind === 'object'
                ? { packages: globs }
                : globs,
        })
      )
      if (kind === 'pnpm') {
        fs.writeFileSync(
          path.join(workspaceRoot, 'pnpm-workspace.yaml'),
          'packages: &paths\n  - app\n  - "packages/*" # workspace packages\n'
        )
      }
      for (const directory of [
        projectRoot,
        shared,
        custom,
        modules,
        path.join(workspaceRoot, 'target'),
      ]) {
        fs.mkdirSync(directory, { recursive: true })
      }
      fs.writeFileSync(path.join(projectRoot, 'package.json'), '{"private":true}')
      fs.symlinkSync(installedModules, path.join(projectRoot, 'node_modules'), 'dir')
      fs.writeFileSync(
        path.join(shared, 'package.json'),
        '{"name":"shared","main":"index.js"}'
      )
      fs.writeFileSync(path.join(shared, 'index.js'), "module.exports='workspace';")
      fs.writeFileSync(path.join(custom, 'index.js'), "module.exports='custom';")
      fs.mkdirSync(path.join(modules, 'root-only'))
      fs.writeFileSync(path.join(modules, 'root-only/index.js'), "module.exports='root';")
      fs.writeFileSync(
        path.join(workspaceRoot, 'target/build-output.js'),
        "module.exports='target';"
      )
      for (const excluded of [
        'missing-manifest',
        'invalid',
        'Pods/hidden',
        'Carthage/hidden',
        'node_modules/hidden',
      ]) {
        const directory = path.join(workspaceRoot, 'packages', excluded)
        fs.mkdirSync(directory, { recursive: true })
        if (excluded !== 'missing-manifest') {
          fs.writeFileSync(
            path.join(directory, 'package.json'),
            excluded === 'invalid' ? '{' : '{}'
          )
        }
      }
      const { defaultConfig } = await buildMetroConfigInputFromViteConfig(
        { root: projectRoot } as any,
        {
          watchman: false,
          defaultConfigOverrides: (config: any) => ({
            watchFolders: [custom, installedModules, custom],
            resolver: { ...config.resolver, nodeModulesPaths: [modules] },
          }),
        } as any
      )
      expect(defaultConfig.watchFolders).toEqual([
        custom,
        installedModules,
        modules,
        projectRoot,
        shared,
      ])
      expect(defaultConfig.resolver.nodeModulesPaths).toEqual([
        modules,
        path.join(projectRoot, 'node_modules'),
      ])

      if (kind !== 'array') return
      const require = createRequire(path.join(installedModules, '../package.json'))
      const Server = require('metro/private/Server').default
      const output = require('metro/private/shared/output/bundle')
      const entry = path.join(projectRoot, 'entry.js')
      const forbiddenEntry = path.join(projectRoot, 'forbidden.js')
      fs.writeFileSync(
        entry,
        "globalThis.values=[require('../packages/shared'),require('root-only'),require('../custom')];"
      )
      fs.writeFileSync(
        forbiddenEntry,
        "globalThis.values=require('../target/build-output');"
      )
      for (const exposeRoot of [true, false]) {
        const server = new Server({
          ...defaultConfig,
          watchFolders: [
            ...defaultConfig.watchFolders,
            ...(exposeRoot ? [workspaceRoot] : []),
          ],
          maxWorkers: 1,
        })
        try {
          if (exposeRoot) {
            const bundle = await output.build(server, {
              entryFile: forbiddenEntry,
              platform: 'android',
              dev: false,
              minify: false,
            })
            const observed = { values: '' }
            runInNewContext(bundle.code, observed)
            expect(observed.values).toBe('target')
          } else {
            const bundle = await output.build(server, {
              entryFile: entry,
              platform: 'android',
              dev: false,
              minify: false,
            })
            const observed = { values: [] }
            runInNewContext(bundle.code, observed)
            expect(observed.values).toEqual(['workspace', 'root', 'custom'])
            await expect(
              output.build(server, {
                entryFile: forbiddenEntry,
                platform: 'android',
                dev: false,
                minify: false,
              })
            ).rejects.toThrow(/Unable to resolve module/)
          }
        } finally {
          await server.end()
        }
      }
    },
    180_000
  )
})
