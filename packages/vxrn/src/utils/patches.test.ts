import { dirname, join } from 'node:path'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { readJSON } from './fs'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 'junction' avoids Windows admin requirement; type ignored on POSIX

// mock heavy deps that aren't needed for patch resolution tests
vi.mock('@vxrn/compiler', () => ({ transformSWC: vi.fn() }))
vi.mock('@vxrn/vite-flow', () => ({ transformFlowBabel: vi.fn() }))

import { transformSWC } from '@vxrn/compiler'
import {
  type DepPatch,
  type UserDepPatches,
  applyBuiltInPatches,
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
    await mkdir(nmDir, { recursive: true })
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
        await mkdir(storePkgDir, { recursive: true })
        await writeFile(
          join(storePkgDir, 'package.json'),
          makePkg('@react-navigation/core', '7.16.1')
        )
      },
    })

    // verify the patch was applied in the store
    const patchedPkg = await readJSON(
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
        await mkdir(storeDir, { recursive: true })
        await writeFile(
          join(storeDir, 'package.json'),
          makePkg('test-pkg', '1.0.0')
        )
        await writeFile(join(storeDir, 'index.js'), 'module.exports = {}')

        // create symlink at top-level node_modules (like pnpm does when hoisted)
        const symlinkTarget = join(nm, 'test-pkg')
        await symlink(storeDir, symlinkTarget, 'junction')

        // also create .pnpm/node_modules hoisted symlink
        const pnpmHoisted = join(nm, '.pnpm', 'node_modules', 'test-pkg')
        await mkdir(join(nm, '.pnpm', 'node_modules'), { recursive: true })
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
        await mkdir(pkgDir, { recursive: true })
        await writeFile(
          join(pkgDir, 'package.json'),
          makePkg('test-pkg', '1.0.0')
        )
        await writeFile(join(pkgDir, 'index.js'), 'module.exports = {}')
      },
    })

    const content = await readFile(join(nmDir, 'test-pkg', 'index.js'), 'utf-8')
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
        await mkdir(v1Dir, { recursive: true })
        await writeFile(join(v1Dir, 'package.json'), makePkg('test-pkg', '1.0.0'))
        await writeFile(join(v1Dir, 'index.js'), 'module.exports = "v1"')

        // v2 store entry
        const v2Dir = join(nm, '.pnpm', 'test-pkg@2.0.0', 'node_modules', 'test-pkg')
        await mkdir(v2Dir, { recursive: true })
        await writeFile(join(v2Dir, 'package.json'), makePkg('test-pkg', '2.0.0'))
        await writeFile(join(v2Dir, 'index.js'), 'module.exports = "v2"')
      },
    })

    const nmDir = join(tmpDir, 'node_modules')

    // v1 should be patched
    const v1Content = await readFile(
      join(nmDir, '.pnpm', 'test-pkg@1.0.0', 'node_modules', 'test-pkg', 'index.js'),
      'utf-8'
    )
    expect(v1Content).toBe('// v1 patched')

    // v2 should NOT be patched
    const v2Content = await readFile(
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
        await mkdir(storeDir, { recursive: true })
        await writeFile(
          join(storeDir, 'package.json'),
          makePkg('test-pkg', '1.0.0')
        )
        await writeFile(join(storeDir, 'index.js'), 'module.exports = {}')

        // hoisted symlink in .pnpm/node_modules
        await mkdir(join(nm, '.pnpm', 'node_modules'), { recursive: true })
        await symlink(storeDir, join(nm, '.pnpm', 'node_modules', 'test-pkg'), 'junction')
      },
    })

    expect(patchCallCount).toBe(1)

    // verify the file was actually patched
    const content = await readFile(
      join(nmDir, '.pnpm', 'test-pkg@1.0.0', 'node_modules', 'test-pkg', 'index.js'),
      'utf-8'
    )
    expect(content).toContain('// marker')
  })

  it('warns when a patch matches nothing, and stays quiet when it applies', async () => {
    // a patch is a literal string replace against upstream source. when
    // upstream moves the code, the replace silently stops doing anything and
    // whatever it was guarding is quietly unprotected. that is how
    // react-native's RCTTurboModule.mm SIGSEGV patch went dead on RN 0.86.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const stale: DepPatch[] = [
      {
        module: 'test-pkg',
        patchFiles: {
          'index.js': (contents) => (contents || '').replace('CODE THAT MOVED', 'fixed'),
        },
      },
    ]

    await setupAndPatch({
      patches: stale,
      setupFs: async (nm) => {
        const pkgDir = join(nm, 'test-pkg')
        await mkdir(pkgDir, { recursive: true })
        await writeFile(
          join(pkgDir, 'package.json'),
          makePkg('test-pkg', '1.0.0')
        )
        await writeFile(join(pkgDir, 'index.js'), 'module.exports = {}')
      },
    })

    expect(warn.mock.calls.flat().join(' ')).toContain('stale')
    warn.mockClear()

    // a patch that does apply must not warn, or the warning is noise
    const applies: DepPatch[] = [
      {
        module: 'test-pkg',
        patchFiles: {
          'index.js': (contents) =>
            (contents || '').replace(
              'module.exports',
              'globalThis.x = 1; module.exports'
            ),
        },
      },
    ]

    await setupAndPatch({
      patches: applies,
      setupFs: async (nm) => {
        const pkgDir = join(nm, 'test-pkg')
        await mkdir(pkgDir, { recursive: true })
        await writeFile(
          join(pkgDir, 'package.json'),
          makePkg('test-pkg', '1.0.0')
        )
        await writeFile(join(pkgDir, 'index.js'), 'module.exports = {}')
      },
    })

    expect(warn.mock.calls.flat().join(' ')).not.toContain('stale')
    warn.mockRestore()
  })

  it('logs a throwing void TurboModule unless the app opts out of built-in patches', async () => {
    const path =
      'ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModule.mm'
    const logged =
      'RCTLogError(@"Exception in %s.%s: %@", moduleName, methodNameStr.c_str(), exception.reason);'
    const source = `    @try {
      [inv invokeWithTarget:strongModule];
    } @catch (NSException *exception) {
      // Void methods are always async, re-throw instead of converting to
      // JSError, same as the async branch in performMethodInvocation.
      @throw addModuleIdentityToException(exception, std::string{moduleName}, methodNameStr);
    } @finally {`

    const run = async (patches?: UserDepPatches) => {
      const root = await mkdtemp(join(tmpDir, 'app-'))
      const pkgDir = join(root, 'node_modules', 'react-native')
      await mkdir(join(pkgDir, dirname(path)), { recursive: true })
      await writeFile(join(pkgDir, 'package.json'), makePkg('react-native', '0.88.0'))
      await writeFile(join(pkgDir, path), source)
      await applyBuiltInPatches({ root, patches })
      return readFile(join(pkgDir, path), 'utf8')
    }

    const patched = await run()
    expect(patched).toContain(logged)
    expect(patched).not.toContain('@throw addModuleIdentityToException')
    expect(await run(false)).toBe(source)
    expect(await run({ 'react-native': false })).toBe(source)
    expect(await run({ 'react-native': { 'package.json': () => {} } })).toContain(logged)
  })

  // a patch is written to node_modules once and then read by every later build,
  // so it must be transformed as production. the dev JSX runtime emits `jsxDEV`,
  // which React's production build exports as `void 0`, so a patched dependency
  // rendering JSX threw "undefined is not a function" from render in every
  // production bundle while dev builds stayed green.
  it('transforms strategy-array patches as production, never the dev JSX runtime', async () => {
    const mockedTransform = vi.mocked(transformSWC)
    mockedTransform.mockClear()
    mockedTransform.mockResolvedValue({ code: 'transformed' } as never)

    await setupAndPatch({
      patches: [{ module: 'test-pkg', patchFiles: { 'index.js': ['swc'] } }],
      setupFs: async (nm) => {
        const pkgDir = join(nm, 'test-pkg')
        await mkdir(pkgDir, { recursive: true })
        await writeFile(
          join(pkgDir, 'package.json'),
          makePkg('test-pkg', '1.0.0')
        )
        await writeFile(join(pkgDir, 'index.js'), 'export default () => <div />')
      },
    })

    expect(mockedTransform).toHaveBeenCalled()
    for (const call of mockedTransform.mock.calls) {
      expect(call[2]).toMatchObject({ production: true })
    }
  })
})
