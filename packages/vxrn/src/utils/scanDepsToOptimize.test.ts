import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { describe, expect, test } from 'vitest'
import { getScannedOptimizeDepsConfig } from '../plugins/autoDepOptimizePlugin'

import { scanDepsToOptimize } from './scanDepsToOptimize'

function writePkg(dir: string, pkg: object) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg))
  writeFileSync(join(dir, 'index.js'), 'export default null\n')
}

describe('scanDepsToOptimize codegenConfig', () => {
  test('excludes native codegen packages but keeps plain react deps', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'vxrn-scan-')))

    writePkg(root, {
      name: 'codegen-fixture',
      private: true,
      dependencies: {
        'fake-native-tabs': '1.0.0',
        'fake-js-lib': '1.0.0',
      },
    })

    // Fabric/TurboModule package: declares codegenConfig and peer-depends on
    // react-native, so without the class exclusion it would be pre-bundled
    // and its codegen entry points would break the SSR build.
    writePkg(join(root, 'node_modules', 'fake-native-tabs'), {
      name: 'fake-native-tabs',
      version: '1.0.0',
      main: './index.js',
      codegenConfig: { name: 'FakeTabs', type: 'all', jsSrcsDir: './src' },
      peerDependencies: { react: '*', 'react-native': '*' },
    })

    writePkg(join(root, 'node_modules', 'fake-js-lib'), {
      name: 'fake-js-lib',
      version: '1.0.0',
      main: './index.js',
      dependencies: { react: '*' },
    })

    writePkg(join(root, 'node_modules', 'react'), {
      name: 'react',
      version: '19.1.0',
      main: './index.js',
    })

    const result = await scanDepsToOptimize(join(root, 'package.json'))

    expect(result.prebundleDeps).toContain('fake-js-lib')
    expect(result.prebundleDeps).not.toContain('fake-native-tabs')
    expect(result.noExternalDeps).toContain('fake-native-tabs')
  })

  test('prebundles installed Expo modules without requiring Expo in the app', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'vxrn-scan-expo-')))

    writePkg(root, {
      name: 'optional-expo-fixture',
      private: true,
      dependencies: {
        'expo-crypto': '1.0.0',
        '@expo/example': '1.0.0',
        '@expo/cli': '1.0.0',
        '@expo/log-box': '1.0.0',
        'community-expo-module': '1.0.0',
        'plain-js-lib': '1.0.0',
      },
    })

    writePkg(join(root, 'node_modules', 'expo-crypto'), {
      name: 'expo-crypto',
      version: '1.0.0',
      main: './index.js',
      peerDependencies: { expo: '*' },
    })
    writePkg(join(root, 'node_modules', '@expo', 'example'), {
      name: '@expo/example',
      version: '1.0.0',
      main: './index.js',
    })
    for (const name of ['cli', 'log-box'])
      writePkg(join(root, 'node_modules', '@expo', name), {
        name: `@expo/${name}`,
        version: '1.0.0',
        main: './index.js',
        dependencies: { '@expo/example': '1.0.0' },
        peerDependencies: { react: '*', 'react-native': '*' },
      })
    writePkg(join(root, 'node_modules', 'community-expo-module'), {
      name: 'community-expo-module',
      version: '1.0.0',
      main: './index.js',
      peerDependencies: { 'expo-modules-core': '*' },
    })
    writePkg(join(root, 'node_modules', 'plain-js-lib'), {
      name: 'plain-js-lib',
      version: '1.0.0',
      main: './index.js',
    })

    const result = await scanDepsToOptimize(join(root, 'package.json'))

    expect(result.prebundleDeps).toEqual(
      expect.arrayContaining(['expo-crypto', '@expo/example', 'community-expo-module'])
    )
    expect(result.prebundleDeps).not.toContain('plain-js-lib')
    expect(result.prebundleDeps).not.toContain('@expo/cli')
    expect(result.prebundleDeps).not.toContain('@expo/log-box')
  })
})

describe('scanDepsToOptimize source entries', () => {
  test('keeps linked TSX source out of prebundling while discovering its React dependency', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'vxrn-scan-source-')))
    writePkg(root, {
      name: 'source-fixture',
      dependencies: { 'source-ui': 'file:packages/source-ui' },
    })
    writePkg(join(root, 'node_modules', 'source-ui'), {
      name: 'source-ui',
      main: './index.tsx',
      dependencies: { 'built-ui': '*' },
    })
    writeFileSync(
      join(root, 'node_modules', 'source-ui', 'index.tsx'),
      'export default <div />\n'
    )
    writePkg(join(root, 'node_modules', 'built-ui'), {
      name: 'built-ui',
      main: './index.js',
      dependencies: { react: '*' },
    })
    writePkg(join(root, 'node_modules', 'react'), {
      name: 'react',
      main: './index.js',
    })

    const result = await scanDepsToOptimize(join(root, 'package.json'))
    expect(result.prebundleDeps).not.toContain('source-ui')
    expect(result.prebundleDeps).toContain('built-ui')
  })
})

describe('codegen SSR entrypoints', () => {
  test('runs extensionless web entrypoints through vite without prebundling native codegen', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'vxrn-codegen-ssr-')))
    writePkg(root, { name: 'fixture', dependencies: { 'fake-native-tabs': '1' } })
    const dep = join(root, 'node_modules', 'fake-native-tabs')
    writePkg(dep, {
      name: 'fake-native-tabs',
      version: '1.0.0',
      type: 'module',
      main: './index.js',
      codegenConfig: { name: 'Fixture', type: 'all', jsSrcsDir: './specs' },
    })
    writeFileSync(join(dep, 'index.js'), "export { answer } from './web-entry'\n")
    writeFileSync(join(dep, 'web-entry.js'), 'export const answer = 42\n')
    writeFileSync(join(root, 'entry.js'), "export { answer } from 'fake-native-tabs'\n")
    const config = await getScannedOptimizeDepsConfig({ root, mode: 'production' })
    expect(config.ssr.optimizeDeps.include).not.toContain('fake-native-tabs')
    const server = await createServer({
      configFile: false,
      root,
      ssr: config.ssr,
      server: { middlewareMode: true },
      optimizeDeps: { noDiscovery: true },
    })
    try {
      const result = await server.ssrLoadModule(join(root, 'entry.js'))
      expect(result.answer).toBe(42)
    } finally {
      await server.close()
    }
  })
})
