import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as babel from '@babel/core'
import * as vm from 'node:vm'
import * as fs from 'node:fs'
import {
  transform,
  getCacheKey,
  wrapModule,
  wrapJson,
  extractDependencies,
  rewriteDependencyCalls,
  countLinesAndTerminateMap,
} from './metroNativeWorker'
import { buildMetroConfigInputFromViteConfig } from '../metro-config/getMetroConfigFromViteConfig'

const babelCalls = {
  transform: 0,
  transformSync: 0,
  transformAsync: 0,
  transformFromAstSync: 0,
  parse: 0,
  parseSync: 0,
}

vi.mock('@babel/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@babel/core')>()
  return {
    ...actual,
    transform: vi.fn((...args: any[]) => {
      babelCalls.transform++
      return (actual.transform as any)(...args)
    }),
    transformSync: vi.fn((...args: any[]) => {
      babelCalls.transformSync++
      return (actual.transformSync as any)(...args)
    }),
    transformAsync: vi.fn((...args: any[]) => {
      babelCalls.transformAsync++
      return (actual.transformAsync as any)(...args)
    }),
    transformFromAstSync: vi.fn((...args: any[]) => {
      babelCalls.transformFromAstSync++
      return (actual.transformFromAstSync as any)(...args)
    }),
    parse: vi.fn((...args: any[]) => {
      babelCalls.parse++
      return (actual.parse as any)(...args)
    }),
    parseSync: vi.fn((...args: any[]) => {
      babelCalls.parseSync++
      return (actual.parseSync as any)(...args)
    }),
  }
})

describe('metroNativeWorker', () => {
  beforeEach(() => {
    babelCalls.transform = 0
    babelCalls.transformSync = 0
    babelCalls.transformAsync = 0
    babelCalls.transformFromAstSync = 0
    babelCalls.parse = 0
    babelCalls.parseSync = 0
  })

  function assertZeroBabelCalls() {
    expect(babelCalls.transform).toBe(0)
    expect(babelCalls.transformSync).toBe(0)
    expect(babelCalls.transformAsync).toBe(0)
    expect(babelCalls.transformFromAstSync).toBe(0)
    expect(babelCalls.parse).toBe(0)
    expect(babelCalls.parseSync).toBe(0)
  }

  it('extracts all dependencies with oxc-parser and zero Babel', () => {
    const code = `
      import React, { useState } from 'react'
      import * as RN from 'react-native'
      import './global.css'
      import type { UserType } from './user-types'
      export { Button } from './Button'
      export * from './icons'
      export type { ThemeType } from './theme-types'
      const helper = require('./helper')
      async function loadAsync() {
        const dyn = await import('./dynamic-module')
      }
    `

    const deps = extractDependencies(code, 'TestComponent.tsx')
    assertZeroBabelCalls()

    const names = deps.map((d) => d.name)
    expect(names).toContain('react')
    expect(names).toContain('react-native')
    expect(names).toContain('./global.css')
    expect(names).toContain('./Button')
    expect(names).toContain('./icons')
    expect(names).toContain('./helper')
    expect(names).toContain('./dynamic-module')

    // Type-only imports and exports should NOT be extracted as runtime dependencies
    expect(names).not.toContain('./user-types')
    expect(names).not.toContain('./theme-types')

    // ESM import flags
    const reactDep = deps.find((d) => d.name === 'react')!
    expect(reactDep.data.isESMImportAtSource).toBe(true)
    expect(reactDep.data.asyncType).toBeNull()
    expect(reactDep.data.locs.length).toBeGreaterThan(0)
    expect(reactDep.data.locs[0]).toHaveProperty('line')
    expect(reactDep.data.locs[0]).toHaveProperty('column')

    // CJS require flag
    const helperDep = deps.find((d) => d.name === './helper')!
    expect(helperDep.data.isESMImportAtSource).toBe(false)
    expect(helperDep.data.asyncType).toBeNull()

    // Dynamic import flag
    const dynamicDep = deps.find((d) => d.name === './dynamic-module')!
    expect(dynamicDep.data.asyncType).toBe('async')
  })

  it('wraps modules in Metro CommonJS format with and without moduleId', () => {
    const code = 'exports.val = 123;'

    const wrappedWithoutId = wrapModule(code)
    expect(wrappedWithoutId).toContain(
      '__d(function (global, _$$_REQUIRE, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {'
    )
    expect(wrappedWithoutId).toContain('var require = _$$_REQUIRE;')
    expect(wrappedWithoutId).toContain('exports.val = 123;')
    expect(wrappedWithoutId.endsWith(');')).toBe(true)

    const wrappedWithId = wrapModule(code, {
      moduleId: 99,
      dependencyIds: [1, 2, 3],
    })
    expect(wrappedWithId).toContain(', 99, [1,2,3]);')
  })

  it('transforms TSX with React JSX, Hermes lowering, and ZERO Babel', async () => {
    const sourceCode = `
      import React from 'react'
      import { View, Text } from 'react-native'
      const helper = require('./helper')

      export class Greeter extends React.Component {
        greeting = 'Hello from Native'

        async fetchGreeting() {
          return this.greeting
        }

        render() {
          return (
            <View testID="greeter">
              <Text>{this.greeting}</Text>
            </View>
          )
        }
      }
    `

    const result = await transform(
      {},
      '/project',
      'Greeter.tsx',
      Buffer.from(sourceCode, 'utf8'),
      { dev: true, platform: 'ios', type: 'module' }
    )

    // Verify ZERO Babel calls
    assertZeroBabelCalls()

    expect(result.output).toHaveLength(1)
    const output = result.output[0]
    expect(output.type).toBe('js/module')
    expect(output.data.lineCount).toBeGreaterThan(0)
    expect(output.data.map.length).toBeGreaterThan(0)

    const code = output.data.code

    // Module wrapping check
    expect(code).toContain(
      '__d(function (global, _$$_REQUIRE, _$$_IMPORT_DEFAULT, _$$_IMPORT_ALL, module, exports, _dependencyMap) {'
    )
    expect(code).toContain('var require = _$$_REQUIRE;')

    // JSX transformed (no raw JSX tags remain)
    expect(code).not.toContain('<View')
    expect(code).not.toContain('<Text')

    // Hermes lowering applied (class field property lowered to constructor)
    expect(code).toContain('this.greeting = "Hello from Native"')

    // Dependencies extracted
    const depNames = result.dependencies.map((d) => d.name)
    expect(depNames).toContain('react')
    expect(depNames).toContain('react-native')
    expect(depNames).toContain('./helper')
    expect(depNames).toContain('react/jsx-dev-runtime')
  })

  it('handles JSON files without Babel', async () => {
    const jsonSource = JSON.stringify({ name: 'my-package', version: '1.0.0' })
    const result = await transform(
      {},
      '/project',
      'package.json',
      Buffer.from(jsonSource, 'utf8'),
      { dev: true, platform: 'ios', type: 'module' }
    )

    assertZeroBabelCalls()
    expect(result.dependencies).toEqual([])
    expect(result.output).toHaveLength(1)
    expect(result.output[0].type).toBe('js/module')
    expect(result.output[0].data.code).toContain('module.exports = {"name":"my-package","version":"1.0.0"}')
    expect(result.output[0].data.code).toContain('__d(function (global, require')
  })

  it('handles Asset files without Babel', async () => {
    const result = await transform(
      {
        assetRegistryPath: 'react-native/Libraries/Image/AssetRegistry',
        publicPath: '/assets',
      },
      '/project',
      'logo.png',
      Buffer.from('fake-png-binary-data', 'utf8'),
      { dev: true, platform: 'ios', type: 'asset' }
    )

    assertZeroBabelCalls()
    expect(result.output[0].type).toBe('js/module/asset')
    expect(result.output[0].data.code).toContain('registerAsset(')
    expect(result.output[0].data.code).toContain('__d(function')

    const depNames = result.dependencies.map((d) => d.name)
    expect(depNames).toContain('react-native/Libraries/Image/AssetRegistry')
  })

  it('handles Flow files by stripping types without Babel', async () => {
    const flowSource = `
      // @flow
      function add(a: number, b: number): number {
        return a + b;
      }
      export default add;
    `

    const result = await transform(
      {},
      '/project',
      'math.js',
      Buffer.from(flowSource, 'utf8'),
      { dev: false, platform: 'ios', type: 'module' }
    )

    assertZeroBabelCalls()
    expect(result.output[0].data.code).not.toContain(': number')
    expect(result.output[0].data.code).toContain('function add(a, b)')
  })

  it('generates a deterministic cache key without Babel', () => {
    const key1 = getCacheKey({ globalPrefix: '__one_', minifierPath: 'terser' }, { projectRoot: '/app' })
    const key2 = getCacheKey({ globalPrefix: '__one_', minifierPath: 'terser' }, { projectRoot: '/app' })
    const key3 = getCacheKey({ globalPrefix: '__other_' }, { projectRoot: '/app' })

    assertZeroBabelCalls()
    expect(key1).toBe(key2)
    expect(key1).not.toBe(key3)
    expect(typeof key1).toBe('string')
    expect(key1.length).toBe(64) // SHA-256 hex
  })

  it('correctly sets transformerPath in buildMetroConfigInputFromViteConfig when active', async () => {
    const mockViteConfig = { root: process.cwd() } as any

    // transformerPath is read by metro at the top level of the config. asserting
    // it under `transformer` passes while metro silently keeps its own worker,
    // so both the presence and the nesting are checked here.

    // Flag off: the key still holds expo's default worker, which is itself proof
    // that top level is where metro reads it from.
    delete process.env.ONE_METRO_NATIVE_TRANSFORMS
    const configOff = await buildMetroConfigInputFromViteConfig(mockViteConfig, {})
    expect(configOff.defaultConfig.transformerPath).not.toContain('metroNativeWorker')

    // Flag on via environment variable
    process.env.ONE_METRO_NATIVE_TRANSFORMS = '1'
    const configEnvOn = await buildMetroConfigInputFromViteConfig(mockViteConfig, {})
    expect(configEnvOn.defaultConfig.transformerPath).toContain('metroNativeWorker')
    expect(configEnvOn.defaultConfig.transformer.transformerPath).toBeUndefined()

    // Flag on via metroPluginOptions
    delete process.env.ONE_METRO_NATIVE_TRANSFORMS
    const configOptOn = await buildMetroConfigInputFromViteConfig(mockViteConfig, {
      nativeTransforms: true,
    })
    expect(configOptOn.defaultConfig.transformerPath).toContain('metroNativeWorker')
    expect(configOptOn.defaultConfig.transformer.transformerPath).toBeUndefined()
  })

  it('transforms and executes a real 2-module Metro bundle through metro-runtime require polyfill', async () => {
    // Probe 1 verification:
    // Module 2 (dep.js): exports a value
    // Module 1 (a.js): requires dep.js using Metro dependency ABI and exports computed result
    const depSource = 'exports.value = 42;'
    const aSource = 'const dep = require("./dep"); module.exports = { doubled: dep.value * 2 };'

    // Transform dep.js (Module 2)
    const depRes = await transform(
      {},
      '/project',
      'dep.js',
      Buffer.from(depSource, 'utf8'),
      {
        dev: false,
        platform: 'ios',
        type: 'module',
        moduleId: 2,
        dependencyIds: [],
      } as any
    )

    // Transform a.js (Module 1) which depends on dep.js (dependency slot 0 -> moduleId 2)
    const aRes = await transform(
      {},
      '/project',
      'a.js',
      Buffer.from(aSource, 'utf8'),
      {
        dev: false,
        platform: 'ios',
        type: 'module',
        moduleId: 1,
        dependencyIds: [2],
      } as any
    )

    assertZeroBabelCalls()

    // Verify dependency extraction
    expect(aRes.dependencies).toHaveLength(1)
    expect(aRes.dependencies[0].name).toBe('./dep')

    // Verify dependency call rewriting to Metro ABI
    const aEmittedCode = aRes.output[0].data.code
    expect(aEmittedCode).toContain('require(_dependencyMap[0], "./dep")')

    // Execute through REAL Metro runtime polyfill
    const polyfillPath = require.resolve('metro-runtime/src/polyfills/require.js')
    const polyfillCode = fs.readFileSync(polyfillPath, 'utf8')

    const contextObj = {
      __DEV__: false,
      __METRO_GLOBAL_PREFIX__: '',
      console: console,
    } as any
    contextObj.global = contextObj
    vm.createContext(contextObj)
    vm.runInContext(polyfillCode, contextObj)

    // Register module 2 and module 1 in the Metro runtime
    vm.runInContext(depRes.output[0].data.code, contextObj)
    vm.runInContext(aEmittedCode, contextObj)

    // Execute Module 1 via Metro's require entrypoint
    const executedExports = vm.runInContext('global.__r(1)', contextObj)
    expect(executedExports).toEqual({ doubled: 84 })
  })

  it('transforms and executes a 2-module Metro bundle with ESM imports in dev mode', async () => {
    const depSource = 'export const greeting = "Hello Metro Native";'
    const aSource = 'import { greeting } from "./dep"; export const message = greeting.toUpperCase();'

    // Transform dep.js (Module 2)
    const depRes = await transform(
      {},
      '/project',
      'dep.js',
      Buffer.from(depSource, 'utf8'),
      {
        dev: true,
        platform: 'ios',
        type: 'module',
        moduleId: 2,
        dependencyIds: [],
      } as any
    )

    // Transform a.js (Module 1) depending on dep.js (dependency slot 0 -> moduleId 2)
    const aRes = await transform(
      {},
      '/project',
      'a.js',
      Buffer.from(aSource, 'utf8'),
      {
        dev: true,
        platform: 'ios',
        type: 'module',
        moduleId: 1,
        dependencyIds: [2],
      } as any
    )

    assertZeroBabelCalls()

    const polyfillPath = require.resolve('metro-runtime/src/polyfills/require.js')
    const polyfillCode = fs.readFileSync(polyfillPath, 'utf8')

    const contextObj = {
      __DEV__: true,
      __METRO_GLOBAL_PREFIX__: '',
      console: console,
    } as any
    contextObj.global = contextObj
    vm.createContext(contextObj)
    vm.runInContext(polyfillCode, contextObj)

    vm.runInContext(depRes.output[0].data.code, contextObj)
    vm.runInContext(aRes.output[0].data.code, contextObj)

    const executedExports = vm.runInContext('global.__r(1)', contextObj)
    expect(executedExports.message).toBe('HELLO METRO NATIVE')
  })

  it('respects lexical scope shadowing for require calls (Astra probe)', async () => {
    // Exact probe from Astra:
    // function f(require){return require("./local")}; module.exports=f(x=>x);
    // require is shadowed by parameter: must NOT extract ./local, and must NOT rewrite require
    const input = 'function f(require){return require("./local")}; module.exports=f(x=>x);'

    const res = await transform(
      {},
      '/project',
      'shadowed.js',
      Buffer.from(input, 'utf8'),
      {
        dev: false,
        platform: 'ios',
        type: 'module',
        moduleId: 1,
        dependencyIds: [],
      } as any
    )

    assertZeroBabelCalls()

    // 1. Dependency must NOT be extracted
    expect(res.dependencies).toHaveLength(0)

    // 2. Emitted code must NOT rewrite local require to _dependencyMap
    const emitted = res.output[0].data.code
    expect(emitted).not.toContain('_dependencyMap[0]')
    expect(emitted).toMatch(/require\d*\("\.\/local"\)/)

    // 3. Bundled execution through Metro runtime returns the string without missing-module error
    const polyfillPath = require.resolve('metro-runtime/src/polyfills/require.js')
    const polyfillCode = fs.readFileSync(polyfillPath, 'utf8')

    const contextObj = {
      __DEV__: false,
      __METRO_GLOBAL_PREFIX__: '',
      console: console,
    } as any
    contextObj.global = contextObj
    vm.createContext(contextObj)
    vm.runInContext(polyfillCode, contextObj)

    vm.runInContext(emitted, contextObj)
    const result = vm.runInContext('global.__r(1)', contextObj)
    expect(result).toBe('./local')
  })

  it('preserves distinct indexed identity for duplicate and mixed sync/async dependencies', async () => {
    const code = `
      const a = require('./dep');
      const b = require('./dep');
      async function load() {
        const c = await import('./dep');
      }
    `
    const res = await transform(
      {},
      '/project',
      'index.js',
      Buffer.from(code, 'utf8'),
      { dev: false, platform: 'ios', type: 'module' }
    )

    assertZeroBabelCalls()

    // Key format separates sync require from async import
    const depNames = res.dependencies.map((d) => d.name)
    expect(depNames).toContain('./dep')

    const syncDep = res.dependencies.find((d) => d.name === './dep' && d.data.asyncType === null)!
    const asyncDep = res.dependencies.find((d) => d.name === './dep' && d.data.asyncType === 'async')!
    expect(syncDep).toBeDefined()
    expect(asyncDep).toBeDefined()
    expect(syncDep.data.index).not.toEqual(asyncDep.data.index)

    // Rewritten code points both sync require calls to the sync dependency slot index
    const emitted = res.output[0].data.code
    const syncIndex = syncDep.data.index
    expect(emitted).toContain(`require(_dependencyMap[${syncIndex}], "./dep")`)
  })

  it('conforms to Metro map ABI with raw mapping segment tuples and accurate symbolication', async () => {
    const sourceCode = `
      export function add(a: number, b: number): number {
        return a + b;
      }
    `

    const res = await transform(
      {},
      '/project',
      'math.ts',
      Buffer.from(sourceCode, 'utf8'),
      { dev: false, platform: 'ios', type: 'module' }
    )

    assertZeroBabelCalls()

    const map = res.output[0].data.map
    expect(Array.isArray(map)).toBe(true)
    expect(map.length).toBeGreaterThan(0)

    // Verify Metro Raw Mapping Segment Tuples:
    // Every element must be an array tuple [line, column, origLine?, origCol?, name?]
    // No SourceMapV3 objects embedded
    for (const tuple of map) {
      expect(Array.isArray(tuple)).toBe(true)
      expect(typeof tuple[0]).toBe('number') // generated line (1-based)
      expect(typeof tuple[1]).toBe('number') // generated column (0-based)
      expect(tuple).not.toHaveProperty('version')
      expect(tuple).not.toHaveProperty('mappings')
    }

    // Verify with Metro's own fromRawMappings and Consumer
    const msm = await import('metro-source-map')
    const fullMap = (msm.fromRawMappings as any)([
      {
        code: res.output[0].data.code,
        source: 'math.ts',
        map,
      },
    ]).toMap()

    const consumer = new msm.Consumer(fullMap)
    // Find generated line for function add
    const lines = res.output[0].data.code.split('\n')
    const addLineIndex = lines.findIndex((l) => l.includes('function add'))
    expect(addLineIndex).toBeGreaterThan(0)

    const pos = consumer.originalPositionFor({
      line: (addLineIndex + 1) as any,
      column: 16 as any,
    })

    expect(pos.line).toBe(2)
  })

  it('models JS hoisting in ScopeTracker for functions and vars (Astra probe)', async () => {
    // Exact probe from Astra:
    // function f(){const x=require("./local"); function require(x){return x}; return x} module.exports=f();
    // function require is hoisted to f's function scope, so require("./local") is a local call and needs no module.
    const input = 'function f(){const x=require("./local"); function require(x){return x}; return x} module.exports=f();'

    const res = await transform(
      {},
      '/project',
      'hoisted.js',
      Buffer.from(input, 'utf8'),
      {
        dev: false,
        platform: 'ios',
        type: 'module',
        moduleId: 1,
        dependencyIds: [],
      } as any
    )

    assertZeroBabelCalls()

    // 1. Dependency must NOT be extracted
    expect(res.dependencies).toHaveLength(0)

    // 2. Emitted code must NOT rewrite require("./local") to _dependencyMap
    const emitted = res.output[0].data.code
    expect(emitted).not.toContain('_dependencyMap[0]')
    expect(emitted).toMatch(/require\d*\("\.\/local"\)/)

    // 3. Bundled execution through Metro runtime returns "./local" without missing-module error
    const polyfillPath = require.resolve('metro-runtime/src/polyfills/require.js')
    const polyfillCode = fs.readFileSync(polyfillPath, 'utf8')

    const contextObj = {
      __DEV__: false,
      __METRO_GLOBAL_PREFIX__: '',
      console: console,
    } as any
    contextObj.global = contextObj
    vm.createContext(contextObj)
    vm.runInContext(polyfillCode, contextObj)

    vm.runInContext(emitted, contextObj)
    const result = vm.runInContext('global.__r(1)', contextObj)
    expect(result).toBe('./local')
  })

  it('rewrites dynamic import to Metro asyncRequire and executes promise resolution in dev and release', async () => {
    // Exact probe from Astra:
    // transform of module.exports = () => import("./dep");
    // Emitted __d wrapper must rewrite to require(asyncRequire)(_dependencyMap[dep], _dependencyMap.paths, "./dep")
    // and resolve promise through real Metro runtime.
    const depSource = 'exports.message = "hello dynamic";'
    const mainSource = 'module.exports = () => import("./dep");'

    const depRes = await transform(
      {},
      '/project',
      'dep.js',
      Buffer.from(depSource, 'utf8'),
      {
        dev: true,
        platform: 'ios',
        type: 'module',
        moduleId: 2,
        dependencyIds: [],
      } as any
    )

    const mainRes = await transform(
      {},
      '/project',
      'main.js',
      Buffer.from(mainSource, 'utf8'),
      {
        dev: true,
        platform: 'ios',
        type: 'module',
        moduleId: 0,
        dependencyIds: [2, 1], // slot 0 -> module 2 (dep), slot 1 -> module 1 (asyncRequire)
      } as any
    )

    assertZeroBabelCalls()

    // 1. Dependencies include ./dep (async) and asyncRequire (sync)
    const depNames = mainRes.dependencies.map((d) => d.name)
    expect(depNames).toContain('./dep')
    expect(depNames).toContain('metro-runtime/src/modules/asyncRequire')

    const dynDep = mainRes.dependencies.find((d) => d.name === './dep')!
    expect(dynDep.data.asyncType).toBe('async')

    // 2. Emitted code must rewrite import("./dep") to asyncRequire call
    const emittedMain = mainRes.output[0].data.code
    expect(emittedMain).not.toContain('import("./dep")')
    expect(emittedMain).toContain(
      'require(_dependencyMap[1], "metro-runtime/src/modules/asyncRequire")(_dependencyMap[0], _dependencyMap.paths, "./dep")'
    )

    // 3. Test Metro VM runtime execution in DEV and RELEASE modes
    const polyfillPath = require.resolve('metro-runtime/src/polyfills/require.js')
    const polyfillCode = fs.readFileSync(polyfillPath, 'utf8')
    const asyncRequirePath = require.resolve('metro-runtime/src/modules/asyncRequire.js')
    const asyncRequireSource = fs.readFileSync(asyncRequirePath, 'utf8')
    const wrappedAsyncRequire = wrapModule(asyncRequireSource, { moduleId: 1, dependencyIds: [] })

    for (const isDev of [true, false]) {
      const contextObj = {
        __DEV__: isDev,
        __METRO_GLOBAL_PREFIX__: '',
        console: console,
      } as any
      contextObj.global = contextObj
      vm.createContext(contextObj)
      vm.runInContext(polyfillCode, contextObj)

      // Register asyncRequire (1), dep (2), and main (0)
      vm.runInContext(wrappedAsyncRequire, contextObj)
      vm.runInContext(depRes.output[0].data.code, contextObj)
      vm.runInContext(emittedMain, contextObj)

      const mainFn = vm.runInContext('global.__r(0)', contextObj)
      expect(typeof mainFn).toBe('function')

      const promise = mainFn()
      expect(promise instanceof Promise || (promise && typeof promise.then === 'function')).toBe(true)

      const resolved = await promise
      expect(resolved.message).toBe('hello dynamic')
      expect(resolved.default.message).toBe('hello dynamic')
    }
  })

  it('preserves accurate sourcemap for tokens after rewritten require calls on the same line', async () => {
    // Exact probe from Astra:
    // rewriteDependencyCalls returns { code, map }
    // Trace a source location AFTER a rewritten require on the same generated line
    const sourceCode = 'const a = require("./dep"), b = 42;'

    // Transform with module wrapping (standard mode)
    const resWrapped = await transform(
      {},
      '/project',
      'app.js',
      Buffer.from(sourceCode, 'utf8'),
      {
        dev: false,
        platform: 'ios',
        type: 'module',
      } as any
    )

    assertZeroBabelCalls()

    const msm = await import('metro-source-map')
    const fullMapWrapped = (msm.fromRawMappings as any)([
      {
        code: resWrapped.output[0].data.code,
        source: 'app.js',
        map: resWrapped.output[0].data.map,
      },
    ]).toMap()

    const consumerWrapped = new msm.Consumer(fullMapWrapped)
    const linesWrapped = resWrapped.output[0].data.code.split('\n')
    const lineIndexWrapped = linesWrapped.findIndex((l) => l.includes('b = 42'))
    expect(lineIndexWrapped).toBeGreaterThanOrEqual(0)

    const generatedColWrapped = linesWrapped[lineIndexWrapped].indexOf('b = 42')
    expect(generatedColWrapped).toBeGreaterThan(0)

    const posWrapped = consumerWrapped.originalPositionFor({
      line: (lineIndexWrapped + 1) as any,
      column: generatedColWrapped as any,
    })

    // Original position of 'b = 42' in sourceCode: line 1, column 28
    expect(posWrapped.line).toBe(1)
    expect(posWrapped.column).toBe(28)
    expect(sourceCode.slice(Number(posWrapped.column))).toContain('b = 42;')

    // Also test unwrapped mode: unstable_disableModuleWrapping: true
    const resUnwrapped = await transform(
      { unstable_disableModuleWrapping: true },
      '/project',
      'app.js',
      Buffer.from(sourceCode, 'utf8'),
      {
        dev: false,
        platform: 'ios',
        type: 'module',
      } as any
    )

    const fullMapUnwrapped = (msm.fromRawMappings as any)([
      {
        code: resUnwrapped.output[0].data.code,
        source: 'app.js',
        map: resUnwrapped.output[0].data.map,
      },
    ]).toMap()

    const consumerUnwrapped = new msm.Consumer(fullMapUnwrapped)
    const linesUnwrapped = resUnwrapped.output[0].data.code.split('\n')
    const lineIndexUnwrapped = linesUnwrapped.findIndex((l) => l.includes('b = 42'))
    expect(lineIndexUnwrapped).toBeGreaterThanOrEqual(0)

    const generatedColUnwrapped = linesUnwrapped[lineIndexUnwrapped].indexOf('b = 42')
    const posUnwrapped = consumerUnwrapped.originalPositionFor({
      line: (lineIndexUnwrapped + 1) as any,
      column: generatedColUnwrapped as any,
    })

    expect(posUnwrapped.line).toBe(1)
    expect(posUnwrapped.column).toBe(28)
  })
})
