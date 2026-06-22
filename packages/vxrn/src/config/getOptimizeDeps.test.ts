import { describe, expect, it } from 'vitest'
import { getOptimizeDeps } from './getOptimizeDeps'

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
