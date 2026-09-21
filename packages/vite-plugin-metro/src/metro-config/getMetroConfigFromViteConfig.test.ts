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
    // defaultConfigOverrides can replace the resolver wholesale. the final
    // merged config must still resolve the metro-parsed ./one/metro-entry
    // entry as its bare package specifier.
    const workspaceRoot = path.resolve(__dirname, '../../../../')
    const fixtureRoot = fs.mkdtempSync(path.join(workspaceRoot, '.tmp-metro-entry-'))
    tmpDirs.push(fixtureRoot)

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

    await (defaultConfig as any).resolver.resolveRequest(
      {
        originModulePath: `${fixtureRoot}/.`,
        resolveRequest: (_ctx: any, name: string) => {
          seen.push(name)
          return { type: 'sourceFile', filePath: name }
        },
      },
      './one/metro-entry',
      'ios'
    )
    expect(seen).toEqual(['one/metro-entry'])

    await (defaultConfig as any).resolver.resolveRequest(
      {
        originModulePath: `${fixtureRoot}/.`,
        resolveRequest: (_ctx: any, name: string) => {
          seen.push(name)
          return { type: 'sourceFile', filePath: name }
        },
      },
      'react-native',
      'ios'
    )
    expect(seen).toEqual(['one/metro-entry', 'react-native'])
  })
})
