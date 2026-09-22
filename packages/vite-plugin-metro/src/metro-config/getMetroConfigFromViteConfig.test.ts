import fs from 'node:fs'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { buildMetroConfigInputFromViteConfig } from './getMetroConfigFromViteConfig'

const tmpDirs: string[] = []

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

  it('orders .native extensions before ts so web index files never shadow native ones', async () => {
    const workspaceRoot = path.resolve(__dirname, '../../../../')
    const fixtureRoot = fs.mkdtempSync(path.join(workspaceRoot, '.tmp-metro-exts-'))
    tmpDirs.push(fixtureRoot)
    fs.writeFileSync(
      path.join(fixtureRoot, 'package.json'),
      JSON.stringify({ name: 'tmp-metro-exts', private: true })
    )

    const { defaultConfig } = await buildMetroConfigInputFromViteConfig(
      { root: fixtureRoot } as any,
      { mainModuleName: 'one/metro-entry', watchman: false } as any
    )

    const sourceExts = (defaultConfig as any).resolver.sourceExts as string[]
    expect(sourceExts.indexOf('native.tsx')).toBeLessThan(sourceExts.indexOf('ts'))
    expect(sourceExts.indexOf('native.ts')).toBeLessThan(sourceExts.indexOf('ts'))
    expect(sourceExts).toContain('mjs')
    expect(sourceExts).toContain('cjs')
  })
})
