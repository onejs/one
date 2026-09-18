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
})
