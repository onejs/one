import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { scanDepsToOptimize } from './scanDepsToOptimize'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('scanDepsToOptimize', () => {
  test('emits a dependency-chain id for a nested CommonJS version', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-scan-deps-'))
    roots.push(root)

    writePackage(root, {
      name: 'app',
      dependencies: {
        parent: '1.0.0',
        '@scope/semantic-conventions': '1.43.0',
      },
    })
    writePackage(join(root, 'node_modules/parent'), {
      name: 'parent',
      version: '1.0.0',
      type: 'module',
      exports: { '.': { import: './index.js', default: './index.js' } },
      dependencies: { '@scope/semantic-conventions': '1.39.0' },
    })
    writeFileSync(
      join(root, 'node_modules/parent/index.js'),
      'export const parent = true\n'
    )

    const rootConvention = join(root, 'node_modules/@scope/semantic-conventions')
    writePackage(rootConvention, {
      name: '@scope/semantic-conventions',
      version: '1.43.0',
      type: 'module',
      exports: { '.': { import: './index.js', default: './index.js' } },
    })
    writeFileSync(join(rootConvention, 'index.js'), 'export const version = "1.43"\n')

    const nestedConvention = join(
      root,
      'node_modules/parent/node_modules/@scope/semantic-conventions'
    )
    writePackage(nestedConvention, {
      name: '@scope/semantic-conventions',
      version: '1.39.0',
      exports: {
        '.': {
          module: './build/esm.js',
          default: './build/cjs.js',
        },
      },
    })
    mkdirSync(join(nestedConvention, 'build'), { recursive: true })
    writeFileSync(
      join(nestedConvention, 'build/esm.js'),
      'export const version = "1.39"\n'
    )
    writeFileSync(join(nestedConvention, 'build/cjs.js'), 'exports.version = "1.39"\n')

    const result = await scanDepsToOptimize(join(root, 'package.json'), {
      noExternal: true,
    })

    expect(result.prebundleDeps).toContain('parent > @scope/semantic-conventions')
    expect(result.prebundleDeps).not.toContain('@scope/semantic-conventions')
  })
})

function writePackage(directory: string, pkg: Record<string, unknown>) {
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, 'package.json'), JSON.stringify(pkg))
}
