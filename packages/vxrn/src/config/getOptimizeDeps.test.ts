import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getOptimizeDeps } from './getOptimizeDeps'

function rootWithPackage(name: string, packageJson: Record<string, unknown>) {
  const root = mkdtempSync(join(tmpdir(), 'vxrn-optimize-deps-'))
  const dir = join(root, 'node_modules', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, ...packageJson }))
  return root
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
})
