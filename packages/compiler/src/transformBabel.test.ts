import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { configureVXRNCompilerPlugin } from './configure'
import {
  getBabelOptions,
  transformBabel,
  transformOxcReactCompiler,
} from './transformBabel'

afterEach(() => {
  configureVXRNCompilerPlugin({ enableReanimated: false })
})

describe('getBabelOptions Worklets resolution', () => {
  it('uses the app-installed Worklets Babel plugin', () => {
    const projectRoot = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'vxrn-worklets-'))
    )
    const packageRoot = path.join(projectRoot, 'node_modules', 'react-native-worklets')
    const pluginPath = path.join(packageRoot, 'plugin.js')
    fs.mkdirSync(packageRoot, { recursive: true })
    fs.writeFileSync(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({ name: 'react-native-worklets', version: '99.0.0' })
    )
    fs.writeFileSync(pluginPath, 'module.exports = () => ({ visitor: {} })')

    try {
      configureVXRNCompilerPlugin({ enableReanimated: true })
      const options = getBabelOptions({
        id: path.join(projectRoot, 'input.ts'),
        code: `export const worklet = () => {
          'worklet'
        }`,
        development: true,
        environment: 'ios',
        reactForRNVersion: '19',
        projectRoot,
      })

      expect(options?.plugins).toContain(pluginPath)
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true })
    }
  })
})

describe('transformBabel Flow parsing', () => {
  it('parses and strips React Native Flow as-casts', async () => {
    const result = await transformBabel(
      '/project/VirtualViewNativeComponent.js',
      `
        // @flow strict-local
        import type { HostComponent } from './HostComponent'
        import codegenNativeComponent from './codegenNativeComponent'

        type Props = $ReadOnly<{ enabled?: boolean }>

        export default codegenNativeComponent<Props>('VirtualView') as HostComponent<Props>
      `,
      { plugins: [] }
    )

    expect(result?.code).toContain("codegenNativeComponent('VirtualView')")
    expect(result?.code).not.toContain('HostComponent')
  })

  it('rejects a required transform error instead of returning untransformed source', async () => {
    const negativeControl = () => ({
      visitor: {
        Program() {
          throw new Error('NATIVE_TRANSFORM_NEGATIVE_CONTROL')
        },
      },
    })

    await expect(
      transformBabel('/project/TransformProbe.ts', 'export const marker = 1', {
        plugins: [negativeControl],
      })
    ).rejects.toThrow('NATIVE_TRANSFORM_NEGATIVE_CONTROL')
  })
})

describe('transformOxcReactCompiler', () => {
  const componentCode = `
    import { useState } from 'react'

    export function Counter() {
      const [count, setCount] = useState(0)
      return <button onClick={() => setCount(count + 1)}>{count}</button>
    }
  `

  it('compiles and memoizes React components with Rust React Compiler', async () => {
    const result = await transformOxcReactCompiler(
      '/project/Counter.tsx',
      componentCode,
      '19',
      false
    )

    expect(result.code).toContain('_c(')
    expect(result.code).toContain('react/compiler-runtime')
    expect(result.map).toBeUndefined()
  })

  it('generates source maps when requested', async () => {
    const result = await transformOxcReactCompiler(
      '/project/Counter.tsx',
      componentCode,
      '19',
      true
    )

    expect(result.code).toContain('_c(')
    expect(result.map).toBeDefined()
    expect(result.map?.mappings).toBeDefined()
  })

  it('supports target 18', async () => {
    const result = await transformOxcReactCompiler(
      '/project/Counter.tsx',
      componentCode,
      '18',
      false
    )

    expect(result.code).toContain('_c(')
  })
})

describe('compiler plugin multi-stage source map composition', () => {
  it('composes earlier compiler maps when Babel also runs', async () => {
    const { createVXRNCompilerPlugin } = await import('./index')
    const { TraceMap, originalPositionFor } = await import('@jridgewell/trace-mapping')

    const origSourceMap = process.env.VXRN_ENABLE_SOURCE_MAP
    const origBabelGen = process.env.VXRN_USE_BABEL_FOR_GENERATORS
    process.env.VXRN_ENABLE_SOURCE_MAP = '1'
    process.env.VXRN_USE_BABEL_FOR_GENERATORS = '1'
    configureVXRNCompilerPlugin({ enableCompiler: true })

    const tempFile = path.join(os.tmpdir(), `Counter-${Date.now()}.tsx`)
    fs.writeFileSync(
      tempFile,
      `import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}

export async function* generatorProbe() {
  throw new Error("MARKER")
}
`
    )

    try {
      const plugins = await createVXRNCompilerPlugin()
      const plugin = plugins.find((p: any) => p.name === 'one:compiler') as any
      await plugin.configResolved({ root: os.tmpdir(), build: {} })
      const hook = plugin.transform.handler || plugin.transform

      const code = fs.readFileSync(tempFile, 'utf8')
      const context = { environment: { name: 'client' } }
      const result = await hook.call(context, code, tempFile)

      expect(result).toBeDefined()
      expect(result.map).toBeDefined()

      const tracer = new TraceMap(result.map)
      const lines = result.code.split('\n')
      const markerLineIndex = lines.findIndex((l: string) => l.includes('MARKER'))
      expect(markerLineIndex).toBeGreaterThan(0)
      const markerCol = lines[markerLineIndex].indexOf('throw')

      const pos = originalPositionFor(tracer, {
        line: markerLineIndex + 1,
        column: markerCol,
      })

      expect(pos.source).toBe(tempFile)
      expect(pos.line).toBe(9)
    } finally {
      if (origSourceMap !== undefined) {
        process.env.VXRN_ENABLE_SOURCE_MAP = origSourceMap
      } else {
        delete process.env.VXRN_ENABLE_SOURCE_MAP
      }
      if (origBabelGen !== undefined) {
        process.env.VXRN_USE_BABEL_FOR_GENERATORS = origBabelGen
      } else {
        delete process.env.VXRN_USE_BABEL_FOR_GENERATORS
      }
      configureVXRNCompilerPlugin({ enableCompiler: false })
      fs.rmSync(tempFile, { force: true })
    }
  })
})

describe('shared compiler worklets backend selection', () => {
  it('retains Babel for worklets by default when enableNativeWorklets is false', async () => {
    const { vi } = await import('vitest')
    const { createVXRNCompilerPlugin } = await import('./index')
    const workletsModule = await import('./transformWorklets')
    const workletSpy = vi.spyOn(workletsModule, 'transformWorklets')

    configureVXRNCompilerPlugin({
      enableReanimated: true,
      enableNativeWorklets: false,
    })

    const tempFile = path.join(process.cwd(), `test-default-worklet-${Date.now()}.tsx`)
    const inputCode = `export function fn() { 'worklet'; return 1 }`
    fs.writeFileSync(tempFile, inputCode)

    try {
      const plugins = await createVXRNCompilerPlugin()
      const plugin = plugins.find((p: any) => p.name === 'one:compiler') as any
      await plugin.configResolved({ root: process.cwd(), build: {} })
      const hook = plugin.transform.handler || plugin.transform
      const context = { environment: { name: 'ios' } }
      const result = await hook.call(context, inputCode, tempFile)
      expect(result).toBeDefined()
      // With enableNativeWorklets: false, transformWorklets (SWC) is NOT called
      expect(workletSpy).not.toHaveBeenCalled()
    } finally {
      workletSpy.mockRestore()
      configureVXRNCompilerPlugin({
        enableReanimated: false,
        enableNativeWorklets: false,
      })
      fs.rmSync(tempFile, { force: true })
    }
  })

  it('uses native SWC for worklets when enableNativeWorklets is true', async () => {
    const compiler = await import('./index')
    const { vi } = await import('vitest')
    const workletsModule = await import('./transformWorklets')
    const workletSpy = vi.spyOn(workletsModule, 'transformWorklets')

    configureVXRNCompilerPlugin({
      enableReanimated: true,
      enableNativeWorklets: true,
    })

    const tempFile = path.join(process.cwd(), `test-native-worklet-${Date.now()}.tsx`)
    const inputCode = `export function fn() { 'worklet'; return 1 }`
    fs.writeFileSync(tempFile, inputCode)

    try {
      const plugins = await compiler.createVXRNCompilerPlugin()
      const plugin = plugins.find((p: any) => p.name === 'one:compiler') as any
      await plugin.configResolved({ root: process.cwd(), build: {} })
      const hook = plugin.transform.handler || plugin.transform
      const context = { environment: { name: 'ios' } }
      const result = await hook.call(context, inputCode, tempFile)
      expect(result).toBeDefined()
      // With enableNativeWorklets: true, transformWorklets (SWC) IS called
      expect(workletSpy).toHaveBeenCalled()
    } finally {
      workletSpy.mockRestore()
      configureVXRNCompilerPlugin({
        enableReanimated: false,
        enableNativeWorklets: false,
      })
      fs.rmSync(tempFile, { force: true })
    }
  })

  it('invalidates cache when toggling worklets backend on the same unchanged file', async () => {
    const compiler = await import('./index')
    const { vi } = await import('vitest')
    const workletsModule = await import('./transformWorklets')
    const workletSpy = vi.spyOn(workletsModule, 'transformWorklets')

    const tempFile = path.join(process.cwd(), `test-cache-toggle-${Date.now()}.tsx`)
    const inputCode = `export function fn() { 'worklet'; return 1 }`
    fs.writeFileSync(tempFile, inputCode)

    try {
      // Step 1: Run with Babel backend (enableNativeWorklets: false)
      configureVXRNCompilerPlugin({
        enableReanimated: true,
        enableNativeWorklets: false,
      })

      const plugins1 = await compiler.createVXRNCompilerPlugin()
      const plugin1 = plugins1.find((p: any) => p.name === 'one:compiler') as any
      await plugin1.configResolved({ root: process.cwd(), build: {} })
      const hook1 = plugin1.transform.handler || plugin1.transform
      const context = { environment: { name: 'ios' } }

      const res1 = await hook1.call(context, inputCode, tempFile)
      expect(res1).toBeDefined()
      expect(workletSpy).toHaveBeenCalledTimes(0)

      // Step 2: Toggle to native SWC backend on the SAME file without changes
      configureVXRNCompilerPlugin({
        enableReanimated: true,
        enableNativeWorklets: true,
      })

      const plugins2 = await compiler.createVXRNCompilerPlugin()
      const plugin2 = plugins2.find((p: any) => p.name === 'one:compiler') as any
      await plugin2.configResolved({ root: process.cwd(), build: {} })
      const hook2 = plugin2.transform.handler || plugin2.transform

      const res2 = await hook2.call(context, inputCode, tempFile)
      expect(res2).toBeDefined()
      // Cache must NOT serve the Babel entry; native transformWorklets must be invoked
      expect(workletSpy).toHaveBeenCalledTimes(1)

      // Step 3: Call again with native SWC to verify caching works for the native backend
      const res3 = await hook2.call(context, inputCode, tempFile)
      expect(res3).toBeDefined()
      expect(workletSpy).toHaveBeenCalledTimes(1)

      // Step 4: Toggle back to Babel backend; cache must not serve SWC entry
      configureVXRNCompilerPlugin({
        enableReanimated: true,
        enableNativeWorklets: false,
      })

      const plugins3 = await compiler.createVXRNCompilerPlugin()
      const plugin3 = plugins3.find((p: any) => p.name === 'one:compiler') as any
      await plugin3.configResolved({ root: process.cwd(), build: {} })
      const hook3 = plugin3.transform.handler || plugin3.transform

      const res4 = await hook3.call(context, inputCode, tempFile)
      expect(res4).toBeDefined()
      // workletSpy should still have only been called once
      expect(workletSpy).toHaveBeenCalledTimes(1)
    } finally {
      workletSpy.mockRestore()
      configureVXRNCompilerPlugin({
        enableReanimated: false,
        enableNativeWorklets: false,
      })
      fs.rmSync(tempFile, { force: true })
    }
  })
})
