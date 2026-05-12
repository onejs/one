import path from 'node:path'
import fs from 'node:fs'
import { afterAll, describe, expect, it } from 'vitest'
import { withOne } from './withOne'

const projectRoot = path.resolve(__dirname, '../../')
const tmpDirs: string[] = []

function createOneFixtureProject() {
  const workspaceRoot = path.resolve(__dirname, '../../../../')
  const tmpDir = fs.mkdtempSync(path.join(workspaceRoot, '.tmp-with-one-'))
  tmpDirs.push(tmpDir)

  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({ name: 'tmp-with-one', private: true })
  )
  fs.writeFileSync(
    path.join(tmpDir, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { paths: {} } })
  )
  fs.mkdirSync(path.join(tmpDir, 'app'))
  fs.writeFileSync(path.join(tmpDir, 'app', 'index.tsx'), 'export default null\n')

  fs.writeFileSync(
    path.join(tmpDir, 'vite.config.ts'),
    `
const defaultConfigOverrides = (config) => ({
  ...config,
  watchFolders: [
    ...(config.watchFolders || []),
    ${JSON.stringify(path.join(tmpDir, 'shared'))},
  ],
  resolver: {
    ...config.resolver,
    extraNodeModules: {
      ...config.resolver?.extraNodeModules,
      'fixture-singleton': ${JSON.stringify(tmpDir)},
    },
  },
})

globalThis.__oneOptions = {
  setupFile: {
    native: './src/setup-native.ts',
  },
  native: {
    bundler: 'metro',
    bundlerOptions: {
      argv: {
        projectRoot: ${JSON.stringify(tmpDir)},
      },
      defaultConfigOverrides,
    },
  },
}
globalThis.__vxrnMetroOptions__ = {
  argv: {
    projectRoot: ${JSON.stringify(tmpDir)},
  },
  defaultConfigOverrides,
}

export default {
  root: ${JSON.stringify(tmpDir)},
}
`
  )

  return tmpDir
}

afterAll(() => {
  for (const tmpDir of tmpDirs) {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})

describe('withOne', () => {
  it('returns a config produced by the production native bundle pipeline', async () => {
    const config = (await withOne(projectRoot, { loadViteConfig: false })) as any

    // The result is whatever Metro's loadConfig returns. The shape must
    // include the resolver and transformer fields the production pipeline
    // installs.
    expect(config).toBeTruthy()
    expect(config.resolver).toBeTruthy()
    expect(typeof config.resolver.resolveRequest).toBe('function')
    expect(config.transformer).toBeTruthy()
    expect(config.transformer.babelTransformerPath).toMatch(
      /vite-plugin-metro.*babel-transformer/
    )
  })

  it('orders sourceExts so .js wins over .mjs (the proven One fix)', async () => {
    const config = (await withOne(projectRoot, { loadViteConfig: false })) as any
    const exts: string[] = config.resolver.sourceExts
    expect(exts).toContain('mjs')
    expect(exts).toContain('js')
    // .js must appear before .mjs so platform-aware lookup finds
    // `.native.js` before `.mjs` for one's dist
    expect(exts.indexOf('js')).toBeLessThan(exts.indexOf('mjs'))
  })

  it('accepts a project root as the first arg', async () => {
    // Mirrors `withOne(__dirname)` usage from a generated metro.config.cjs
    const config = (await withOne(projectRoot, { loadViteConfig: false })) as any
    expect(config).toBeTruthy()
  })

  it('loads vite.config by default and applies the real native Metro options', async () => {
    const fixtureRoot = createOneFixtureProject()
    const config = (await withOne(fixtureRoot)) as any

    expect(config.resolver.extraNodeModules['fixture-singleton']).toBe(
      fixtureRoot
    )
    expect(config.watchFolders).toContain(path.join(fixtureRoot, 'shared'))
  })
})
