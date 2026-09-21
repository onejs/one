import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

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
  })

  test('prebundles installed Expo modules without requiring Expo in the app', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'vxrn-scan-expo-')))

    writePkg(root, {
      name: 'optional-expo-fixture',
      private: true,
      dependencies: {
        'expo-crypto': '1.0.0',
        '@expo/example': '1.0.0',
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
  })
})
