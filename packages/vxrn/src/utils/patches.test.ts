import FSExtra from 'fs-extra'
import { join } from 'node:path'
import { mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 'junction' avoids Windows admin requirement; type ignored on POSIX

// mock heavy deps that aren't needed for patch resolution tests
vi.mock('@vxrn/compiler', () => ({ transformSWC: vi.fn() }))
vi.mock('@vxrn/vite-flow', () => ({ transformFlowBabel: vi.fn() }))

import {
  type DepPatch,
  applyDependencyPatches,
  moduleToPnpmStorePattern,
} from './patches'

// helper to create a minimal package.json
function makePkg(name: string, version: string, extras?: Record<string, any>) {
  return JSON.stringify({ name, version, ...extras }, null, 2)
}

describe('moduleToPnpmStorePattern', () => {
  it('converts scoped package names', () => {
    expect(moduleToPnpmStorePattern('@react-navigation/core')).toBe(
      '@react-navigation+core'
    )
  })

  it('converts other scoped packages', () => {
    expect(moduleToPnpmStorePattern('@expo/cli')).toBe('@expo+cli')
  })

  it('passes through unscoped packages unchanged', () => {
    expect(moduleToPnpmStorePattern('react-native-web')).toBe('react-native-web')
  })
})

describe('applyDependencyPatches', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'vxrn-patch-test-'))
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  // helper to set up node_modules structure and run patches
  async function setupAndPatch(opts: {
    patches: DepPatch[]
    setupFs: (nmDir: string) => Promise<void>
  }) {
    const nmDir = join(tmpDir, 'node_modules')
    await FSExtra.ensureDir(nmDir)
    await opts.setupFs(nmDir)
    await applyDependencyPatches(opts.patches, { root: tmpDir })
    return nmDir
  }

  it('discovers packages in pnpm content-addressable store (non-hoisted)', async () => {
    const patches: DepPatch[] = [
      {
        module: '@react-navigation/core',
        patchFiles: {
          'package.json': (contents) => {
            if (!contents) return
            const pkg = JSON.parse(contents)
            pkg.exports = pkg.exports || {}
            pkg.exports['./lib/module/NavigationBuilderContext'] =
              './lib/module/NavigationBuilderContext.js'
            return JSON.stringify(pkg, null, 2)
          },
        },
      },
    ]

    const nmDir = await setupAndPatch({
      patches,
      setupFs: async (nm) => {
        // create pnpm store entry (package NOT hoisted to top-level or .pnpm/node_modules)
        const storePkgDir = join(
          nm,
          '.pnpm',
          '@react-navigation+core@7.16.1_react@19.0.0',
          'node_modules',
          '@react-navigation',
          'core'
        )
        await FSExtra.ensureDir(storePkgDir)
        await FSExtra.writeFile(
          join(storePkgDir, 'package.json'),
          makePkg('@react-navigation/core', '7.16.1')
        )
      },
    })

    // verify the patch was applied in the store
    const patchedPkg = await FSExtra.readJSON(
      join(
        nmDir,
        '.pnpm',
        '@react-navigation+core@7.16.1_react@19.0.0',
        'node_modules',
        '@react-navigation',
        'core',
        'package.json'
      )
    )
    expect(patchedPkg.exports['./lib/module/NavigationBuilderContext']).toBe(
      './lib/module/NavigationBuilderContext.js'
    )
  })

  it('deduplicates symlink and store entry pointing to same files', async () => {
    let patchCallCount = 0

    const patches: DepPatch[] = [
      {
        module: 'test-pkg',
        patchFiles: {
          'index.js': (contents) => {
            patchCallCount++
            return (contents || '') + '\n// patched'
          },
        },
      },
    ]

    await setupAndPatch({
      patches,
      setupFs: async (nm) => {
        // create the real package in pnpm store
        const storeDir = join(nm, '.pnpm', 'test-pkg@1.0.0', 'node_modules', 'test-pkg')
        await FSExtra.ensureDir(storeDir)
        await FSExtra.writeFile(
          join(storeDir, 'package.json'),
          makePkg('test-pkg', '1.0.0')
        )
        await FSExtra.writeFile(join(storeDir, 'index.js'), 'module.exports = {}')

        // create symlink at top-level node_modules (like pnpm does when hoisted)
        const symlinkTarget = join(nm, 'test-pkg')
        await symlink(storeDir, symlinkTarget, 'junction')

        // also create .pnpm/node_modules hoisted symlink
        const pnpmHoisted = join(nm, '.pnpm', 'node_modules', 'test-pkg')
        await FSExtra.ensureDir(join(nm, '.pnpm', 'node_modules'))
        await symlink(storeDir, pnpmHoisted, 'junction')
      },
    })

    // the non-idempotent patch should have been called exactly once due to dedup
    expect(patchCallCount).toBe(1)
  })

  it('patches flat node_modules (non-pnpm regression)', async () => {
    const patches: DepPatch[] = [
      {
        module: 'test-pkg',
        patchFiles: {
          'index.js': (contents) => {
            return (contents || '') + '\n// patched'
          },
        },
      },
    ]

    const nmDir = await setupAndPatch({
      patches,
      setupFs: async (nm) => {
        // standard flat node_modules layout, no .pnpm
        const pkgDir = join(nm, 'test-pkg')
        await FSExtra.ensureDir(pkgDir)
        await FSExtra.writeFile(
          join(pkgDir, 'package.json'),
          makePkg('test-pkg', '1.0.0')
        )
        await FSExtra.writeFile(join(pkgDir, 'index.js'), 'module.exports = {}')
      },
    })

    const content = await FSExtra.readFile(join(nmDir, 'test-pkg', 'index.js'), 'utf-8')
    expect(content).toContain('// patched')
  })

  it('respects version constraints across multiple store versions', async () => {
    const patches: DepPatch[] = [
      {
        module: 'test-pkg',
        patchFiles: {
          version: '1.*',
          'index.js': () => '// v1 patched',
        },
      },
    ]

    await setupAndPatch({
      patches,
      setupFs: async (nm) => {
        // v1 store entry
        const v1Dir = join(nm, '.pnpm', 'test-pkg@1.0.0', 'node_modules', 'test-pkg')
        await FSExtra.ensureDir(v1Dir)
        await FSExtra.writeFile(join(v1Dir, 'package.json'), makePkg('test-pkg', '1.0.0'))
        await FSExtra.writeFile(join(v1Dir, 'index.js'), 'module.exports = "v1"')

        // v2 store entry
        const v2Dir = join(nm, '.pnpm', 'test-pkg@2.0.0', 'node_modules', 'test-pkg')
        await FSExtra.ensureDir(v2Dir)
        await FSExtra.writeFile(join(v2Dir, 'package.json'), makePkg('test-pkg', '2.0.0'))
        await FSExtra.writeFile(join(v2Dir, 'index.js'), 'module.exports = "v2"')
      },
    })

    const nmDir = join(tmpDir, 'node_modules')

    // v1 should be patched
    const v1Content = await FSExtra.readFile(
      join(nmDir, '.pnpm', 'test-pkg@1.0.0', 'node_modules', 'test-pkg', 'index.js'),
      'utf-8'
    )
    expect(v1Content).toBe('// v1 patched')

    // v2 should NOT be patched
    const v2Content = await FSExtra.readFile(
      join(nmDir, '.pnpm', 'test-pkg@2.0.0', 'node_modules', 'test-pkg', 'index.js'),
      'utf-8'
    )
    expect(v2Content).toBe('module.exports = "v2"')
  })

  it('deduplicates when hoisted symlink and store entry coexist', async () => {
    let patchCallCount = 0

    const patches: DepPatch[] = [
      {
        module: 'test-pkg',
        patchFiles: {
          'index.js': (contents) => {
            patchCallCount++
            return (contents || '') + '\n// marker'
          },
        },
      },
    ]

    const nmDir = await setupAndPatch({
      patches,
      setupFs: async (nm) => {
        // real package in store
        const storeDir = join(nm, '.pnpm', 'test-pkg@1.0.0', 'node_modules', 'test-pkg')
        await FSExtra.ensureDir(storeDir)
        await FSExtra.writeFile(
          join(storeDir, 'package.json'),
          makePkg('test-pkg', '1.0.0')
        )
        await FSExtra.writeFile(join(storeDir, 'index.js'), 'module.exports = {}')

        // hoisted symlink in .pnpm/node_modules
        await FSExtra.ensureDir(join(nm, '.pnpm', 'node_modules'))
        await symlink(storeDir, join(nm, '.pnpm', 'node_modules', 'test-pkg'), 'junction')
      },
    })

    expect(patchCallCount).toBe(1)

    // verify the file was actually patched
    const content = await FSExtra.readFile(
      join(nmDir, '.pnpm', 'test-pkg@1.0.0', 'node_modules', 'test-pkg', 'index.js'),
      'utf-8'
    )
    expect(content).toContain('// marker')
  })
})
