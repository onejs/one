import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getOptimizeDeps } from './getOptimizeDeps'

function rootWithPackage(name: string, packageJson: Record<string, unknown>) {
  const root = mkdtempSync(join(tmpdir(), 'vxrn-optimize-deps-'))
  writePackage(root, name, packageJson)
  return root
}

/** the monorepo/hoisting case: the package sits above the root vite is started from */
function rootWithHoistedPackage(name: string, packageJson: Record<string, unknown>) {
  const workspace = mkdtempSync(join(tmpdir(), 'vxrn-optimize-deps-hoisted-'))
  writePackage(workspace, name, packageJson)
  const root = join(workspace, 'app')
  mkdirSync(root)
  return root
}

function writePackage(at: string, name: string, packageJson: Record<string, unknown>) {
  const dir = join(at, 'node_modules', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, ...packageJson }))
}

describe('getOptimizeDeps', () => {
  it('does not force NativeWind JSX runtime subpaths into dev optimization', () => {
    const { depsToOptimize, needsInterop, optimizeDeps } = getOptimizeDeps('serve')
    const nativewindRuntimeSubpaths = [
      'nativewind/jsx-dev-runtime',
      'nativewind/jsx-runtime',
    ]

    for (const dep of nativewindRuntimeSubpaths) {
      expect(depsToOptimize).not.toContain(dep)
      expect(needsInterop).not.toContain(dep)
      expect(optimizeDeps.include).not.toContain(dep)
      expect(optimizeDeps.needsInterop).not.toContain(dep)
    }

    expect(optimizeDeps.include).toContain('nativewind')
  })
})

describe('getOptimizeDeps subpath guard', () => {
  it('drops subpaths the installed package no longer exports', () => {
    const root = rootWithPackage('react-native-css-interop', {
      exports: { '.': './dist/index.js' },
    })
    const { depsToOptimize, needsInterop, optimizeDeps } = getOptimizeDeps('serve', root)

    for (const dep of [
      'react-native-css-interop/jsx-runtime',
      'react-native-css-interop/jsx-dev-runtime',
    ]) {
      expect(depsToOptimize).not.toContain(dep)
      expect(needsInterop).not.toContain(dep)
      expect(optimizeDeps.include).not.toContain(dep)
      expect(optimizeDeps.needsInterop).not.toContain(dep)
    }

    expect(optimizeDeps.include).toContain('react-native-css-interop')
  })

  it('drops subpaths the installed package blocks with a null export', () => {
    const root = rootWithPackage('react-native-css-interop', {
      exports: {
        '.': './dist/index.js',
        './jsx-runtime': null,
        './jsx-dev-runtime': './dist/jsx-dev-runtime.js',
      },
    })
    const { depsToOptimize, needsInterop, optimizeDeps } = getOptimizeDeps('serve', root)

    // `"./x": null` is not exported, exactly as if the key were absent: vite throws the same
    // `is not exported under the conditions` error for both, so presence of the key is not
    // enough to keep the entry
    expect(depsToOptimize).not.toContain('react-native-css-interop/jsx-runtime')
    expect(needsInterop).not.toContain('react-native-css-interop/jsx-runtime')
    expect(optimizeDeps.include).not.toContain('react-native-css-interop/jsx-runtime')
    expect(optimizeDeps.needsInterop).not.toContain(
      'react-native-css-interop/jsx-runtime'
    )

    expect(optimizeDeps.include).toContain('react-native-css-interop')
    expect(optimizeDeps.include).toContain('react-native-css-interop/jsx-dev-runtime')
  })

  it('finds a package hoisted above the root', () => {
    const root = rootWithHoistedPackage('react-native-css-interop', {
      exports: { '.': './dist/index.js' },
    })

    expect(getOptimizeDeps('serve', root).optimizeDeps.include).not.toContain(
      'react-native-css-interop/jsx-runtime'
    )
  })

  it('resolves a relative root before walking node_modules', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'vxrn-optimize-deps-relative-'))
    writePackage(workspace, 'react-native-css-interop', {
      exports: { '.': './dist/index.js' },
    })
    mkdirSync(join(workspace, 'packages', 'app'), { recursive: true })

    // vite's `config.root` may be relative, and a relative root would stop the walk at the
    // cwd instead of reaching the hoisted copy two directories up
    const cwd = process.cwd()
    try {
      process.chdir(join(workspace, 'packages'))
      expect(getOptimizeDeps('serve', 'app').optimizeDeps.include).not.toContain(
        'react-native-css-interop/jsx-runtime'
      )
    } finally {
      process.chdir(cwd)
    }
  })

  it('keeps subpaths when the installed package has no exports map', () => {
    const root = rootWithPackage('react-native-css-interop', { main: 'dist/index' })

    expect(getOptimizeDeps('serve', root).optimizeDeps.include).toContain(
      'react-native-css-interop/jsx-runtime'
    )
  })

  it('keeps subpaths of packages that are not installed', () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-optimize-deps-empty-'))

    expect(getOptimizeDeps('serve', root).optimizeDeps.include).toContain(
      'react-native-css-interop/jsx-runtime'
    )
  })

  it('keeps subpaths declared through a wildcard export', () => {
    const root = rootWithPackage('react-native-css-interop', {
      exports: { '.': './dist/index.js', './*': './dist/*.js' },
    })

    expect(getOptimizeDeps('serve', root).optimizeDeps.include).toContain(
      'react-native-css-interop/jsx-runtime'
    )
  })

  it('keeps a subpath a wildcard export matches with an empty expansion', () => {
    const root = rootWithPackage('react-native-css-interop', {
      exports: { '.': './dist/index.js', './jsx-runtime*': './dist/jsx-runtime*.js' },
    })

    // vite resolves `./jsx-runtime` off this key, node does not, and the guard follows vite
    // because vite is what actually resolves the include list
    expect(getOptimizeDeps('serve', root).optimizeDeps.include).toContain(
      'react-native-css-interop/jsx-runtime'
    )
  })
})
