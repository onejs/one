import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { configureVXRNCompilerPlugin } from './configure'
import { shouldTransformWorklets, transformWorklets } from './transformWorklets'

afterEach(() => {
  configureVXRNCompilerPlugin({ enableReanimated: false, enableNativeWorklets: false })
})

describe('shouldTransformWorklets', () => {
  it('returns false when enableReanimated is false', () => {
    configureVXRNCompilerPlugin({ enableReanimated: false, enableNativeWorklets: true })
    expect(
      shouldTransformWorklets({
        id: '/app/index.tsx',
        code: `export const foo = () => { 'worklet'; return 1; }`,
      })
    ).toBe(false)
  })

  it('returns false by default when enableNativeWorklets is false even if enableReanimated is true', () => {
    configureVXRNCompilerPlugin({ enableReanimated: true, enableNativeWorklets: false })
    expect(
      shouldTransformWorklets({
        id: '/app/index.tsx',
        code: `export const foo = () => { 'worklet'; return 1; }`,
      })
    ).toBe(false)
  })

  it('returns true when both enableReanimated and enableNativeWorklets are true and worklet keyword is present', () => {
    configureVXRNCompilerPlugin({ enableReanimated: true, enableNativeWorklets: true })
    expect(
      shouldTransformWorklets({
        id: '/app/index.tsx',
        code: `export const foo = () => { 'worklet'; return 1; }`,
      })
    ).toBe(true)
  })

  it('returns false for ignored paths such as react-native internals', () => {
    configureVXRNCompilerPlugin({ enableReanimated: true, enableNativeWorklets: true })
    expect(
      shouldTransformWorklets({
        id: '/project/node_modules/react-native/Libraries/StyleSheet/index.js',
        code: `export const foo = () => { 'worklet'; return 1; }`,
      })
    ).toBe(false)
  })
})

describe('transformWorklets', () => {
  it('transforms functions with worklet directive', async () => {
    const code = `
      export function animate() {
        'worklet'
        return 42
      }
    `
    const result = await transformWorklets('/app/animate.ts', code, false)
    expect(result.code).toContain('__workletHash')
    expect(result.code).toContain('__initData')
    expect(result.code).toContain('__closure')
    expect(result.map).toBeUndefined()
  })

  it('ignores calls whose callee name collides with Object.prototype', async () => {
    // reanimated calls .constructor(), .toString() and similar. these must not
    // resolve against the auto-worklet argument map's prototype chain.
    const code = `
      const out = value.constructor(1)
      const s = thing.toString()
      const h = obj.hasOwnProperty('x')
      const v = obj.valueOf()
    `
    const result = await transformWorklets('/app/collide.ts', code, false)
    expect(result.code).not.toContain('__workletHash')
  })

  it('transforms closure variables into worklet parameters', async () => {
    const code = `
      const factor = 2
      export function multiply(x: number) {
        'worklet'
        return x * factor
      }
    `
    const result = await transformWorklets('/app/multiply.ts', code, false)
    expect(result.code).toContain('__closure')
    expect(result.code).toContain('factor')
  })

  it('transforms an anonymous function expression worklet', async () => {
    // passed inline, so there is no variable to take a name from.
    const code = `
      register(function (e) {
        'worklet'
        return e.x
      })
    `
    const result = await transformWorklets('/app/handler.ts', code, false)
    expect(result.code).toContain('__workletHash')
    expect(result.code).toMatch(/code: "function _worklet\(e\)/)
    expect(result.code).toContain('var _worklet = function _worklet(e)')
  })

  it('does not capture hoisted declarations used before their declaration', async () => {
    // `flushQueue` and `later` are declared below their use. hoisting makes that
    // legal, so neither is a captured variable; treating them as captured puts
    // undefined in the closure and the worklet throws on the UI thread.
    const code = `
      export function setupLoop() {
        'worklet'
        function nativeFlush(t: number) {
          flushQueue(t)
        }
        globalThis.__native(nativeFlush)
        function flushQueue(t: number) {
          globalThis.__stamp = t
        }
        const start = () => later()
        const later = () => start
        return start
      }
    `
    const result = await transformWorklets('/app/setupLoop.ts', code, false)

    expect(result.code).toMatch(/setupLoop\.__closure = \{\s*\}/)
    const init = result.code.match(/code: "function setupLoop[^"]*"/)
    expect(init, 'serialized worklet code').toBeTruthy()
    expect(init![0]).not.toContain('this.__closure')
    expect(init![0]).toContain('flushQueue')
  })

  it('honors no-worklet-closure and limit-init-data-hoisting the way the worklets runtime needs', async () => {
    // this is the shape react-native-worklets uses for its unpacker installers.
    // the outer worklet is serialized to a string and evaluated on a worklet
    // runtime with no closure bound, so it must not emit an unpacker line, and
    // the inner worklet's init data must live inside it rather than at module
    // scope, which does not exist over there.
    const code = `
      const outerModuleValue = 1
      export function installUnpacker() {
        'worklet'
        'no-worklet-closure'
        const proxy = globalThis.__proxy
        proxy.register(outerModuleValue)
        proxy.install(() => {
          'worklet'
          'limit-init-data-hoisting'
          return 42
        })
      }
    `
    const result = await transformWorklets('/app/installUnpacker.ts', code, false)

    const outerInit = result.code.match(/code: "function installUnpacker[^"]*"/)
    expect(outerInit, 'outer worklet serialized code').toBeTruthy()
    // no unpacker line: nothing is read off `this` on the worklet runtime.
    expect(outerInit![0]).not.toContain('this.__closure')
    expect(result.code).toMatch(/installUnpacker\.__closure = \{\s*\}/)
    // the directives themselves are not part of the serialized body.
    expect(outerInit![0]).not.toContain('no-worklet-closure')

    // the inner worklet's init data is declared inside the outer function body,
    // not hoisted to module scope where the worklet runtime cannot see it.
    const innerVar = result.code.match(/var (_worklet_\d+_init_data) = \{\s*code: "function _worklet/)
    expect(innerVar, 'inner worklet init data').toBeTruthy()
    // only look past the serialized string, which mentions the same name inside
    // its escaped body.
    const emitted = result.code.slice(result.code.indexOf('export var installUnpacker'))
    expect(emitted).toContain(`var ${innerVar![1]} = {`)
    expect(result.code.slice(0, result.code.indexOf('export var installUnpacker'))).not.toContain(
      `\nvar ${innerVar![1]} = {`
    )
  })

  it('autoworkletizes hooks like useAnimatedStyle and withTiming', async () => {
    const code = `
      export function Card() {
        const style = useAnimatedStyle(() => {
          return {
            opacity: withTiming(1),
          }
        })
        return <div style={style} />
      }
    `
    const result = await transformWorklets('/app/Card.tsx', code, false)
    expect(result.code).toContain('__workletHash')
    expect(result.code).toContain('useAnimatedStyle')
    expect(result.code).toContain('<div style={style} />')
  })

  it('generates sourcemaps when requested', async () => {
    const code = `
      export const workletFn = () => {
        'worklet'
        return 'ok'
      }
    `
    const result = await transformWorklets('/app/worklet.ts', code, true)
    expect(result.map).toBeDefined()
    expect(result.map?.mappings).toBeDefined()
  })

  it('rejects on transform errors instead of returning untransformed source', async () => {
    await expect(
      transformWorklets(
        '/app/broken.ts',
        `export const fn = () => { 'worklet'; return ;;; const = }`,
        false
      )
    ).rejects.toThrow()
  })

  it('stamps the package runtime version into __pluginVersion to avoid runtime mismatch', async () => {
    const testRoot = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'vxrn-worklets-ver-'))
    )
    const packageRoot = path.join(testRoot, 'node_modules', 'react-native-worklets')
    fs.mkdirSync(packageRoot, { recursive: true })
    fs.writeFileSync(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({ name: 'react-native-worklets', version: '0.10.1' })
    )

    try {
      const result = await transformWorklets(
        path.join(testRoot, 'entry.ts'),
        `export const fn = () => { 'worklet'; return 1; }`,
        false,
        { projectRoot: testRoot }
      )
      expect(result.code).toContain('__pluginVersion = "0.10.1"')
    } finally {
      fs.rmSync(testRoot, { recursive: true, force: true })
    }
  })

  it('correctly resolves hoisted react-native-worklets in a monorepo when child has reanimated', async () => {
    const rootDir = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'vxrn-worklets-hoist-'))
    )
    const appDir = path.join(rootDir, 'apps', 'mobile')
    const hoistedWorkletsDir = path.join(rootDir, 'node_modules', 'react-native-worklets')
    const localReanimatedDir = path.join(
      appDir,
      'node_modules',
      'react-native-reanimated'
    )

    fs.mkdirSync(hoistedWorkletsDir, { recursive: true })
    fs.writeFileSync(
      path.join(hoistedWorkletsDir, 'package.json'),
      JSON.stringify({ name: 'react-native-worklets', version: '0.10.1' })
    )

    fs.mkdirSync(localReanimatedDir, { recursive: true })
    fs.writeFileSync(
      path.join(localReanimatedDir, 'package.json'),
      JSON.stringify({ name: 'react-native-reanimated', version: '4.5.1' })
    )
    fs.writeFileSync(
      path.join(appDir, 'package.json'),
      JSON.stringify({ name: 'mobile' })
    )

    try {
      const result = await transformWorklets(
        path.join(appDir, 'entry.ts'),
        `export function test() { 'worklet'; return 1; }`,
        false,
        { projectRoot: appDir }
      )
      // Must stamp the worklets runtime version (0.10.1), NOT reanimated version (4.5.1)!
      expect(result.code).toContain('__pluginVersion = "0.10.1"')
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true })
    }
  })

  it('throws an actionable error when neither worklets nor reanimated can be resolved', async () => {
    const emptyRoot = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'vxrn-worklets-empty-'))
    )
    fs.writeFileSync(
      path.join(emptyRoot, 'package.json'),
      JSON.stringify({ name: 'empty-test' })
    )

    try {
      await expect(
        transformWorklets(
          path.join(emptyRoot, 'entry.ts'),
          `export function test() { 'worklet'; return 1; }`,
          false,
          { projectRoot: emptyRoot }
        )
      ).rejects.toThrow(
        /Unable to resolve "react-native-worklets" or "react-native-reanimated"/
      )
    } finally {
      fs.rmSync(emptyRoot, { recursive: true, force: true })
    }
  })

  it('forwards plugin options such as bundleMode and globals', async () => {
    const code = `
      export function testCustom() {
        'worklet'
        return customGlobalValue * 2
      }
    `
    const result = await transformWorklets('/app/custom.ts', code, false, {
      globals: ['customGlobalValue'],
      bundleMode: false,
    })
    expect(result.code).toContain('__workletHash')
    expect(result.code).toContain('__initData')
  })

  it('satisfies runtime worklet serialization, local execution, and UI-thread reconstruction', async () => {
    const code = `
      const multiplier = 5
      export function scale(val: number) {
        'worklet'
        return val * multiplier
      }
    `
    const result = await transformWorklets('/app/scale.ts', code, false)

    // Evaluate the transformed code in a JS runtime context
    const sandbox = { global: globalThis, exports: {} as any }
    const runner = new Function(
      'exports',
      'global',
      result.code.replace('export var scale', 'exports.scale')
    )
    runner(sandbox.exports, sandbox.global)

    const scaleFn = sandbox.exports.scale
    expect(typeof scaleFn).toBe('function')
    expect(scaleFn.__workletHash).toBeDefined()
    expect(typeof scaleFn.__workletHash).toBe('number')
    expect(scaleFn.__pluginVersion).toBe('0.10.1')
    expect(scaleFn.__closure).toEqual({ multiplier: 5 })
    expect(scaleFn.__initData).toBeDefined()
    expect(scaleFn.__initData.code).toContain('__closure')

    // Local JS execution
    expect(scaleFn(10)).toBe(50)

    // UI-thread reconstruction from __initData.code + __closure
    const reconstructedUIFn = eval(`(${scaleFn.__initData.code})`)
    const uiResult = reconstructedUIFn.call({ __closure: scaleFn.__closure }, 10)
    expect(uiResult).toBe(50)
  })

  it('autoworkletizes hook callbacks with closure capture and UI-thread execution parity', async () => {
    const code = `
      import { useAnimatedStyle } from 'react-native-reanimated'
      const baseOpacity = 0.8
      export function getCardStyle() {
        return useAnimatedStyle(() => {
          return { opacity: baseOpacity }
        })
      }
    `
    const result = await transformWorklets('/app/CardStyle.ts', code, false)

    let capturedCallback: any = null
    const sandbox = {
      global: globalThis,
      exports: {} as any,
      useAnimatedStyle: (cb: any) => {
        capturedCallback = cb
        return cb
      },
    }
    const runner = new Function(
      'exports',
      'global',
      'useAnimatedStyle',
      result.code
        .replace(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"];?/, '')
        .replace(
          'export function getCardStyle',
          'exports.getCardStyle = function getCardStyle'
        )
    )
    runner(sandbox.exports, sandbox.global, sandbox.useAnimatedStyle)

    sandbox.exports.getCardStyle()
    expect(capturedCallback).toBeDefined()
    expect(capturedCallback.__workletHash).toBeDefined()
    expect(capturedCallback.__closure).toEqual({ baseOpacity: 0.8 })

    // UI thread execution of the animated style worklet
    const reconstructedStyleFn = eval(`(${capturedCallback.__initData.code})`)
    const styleResult = reconstructedStyleFn.call({
      __closure: capturedCallback.__closure,
    })
    expect(styleResult).toEqual({ opacity: 0.8 })
  })

  it('compiles UI-thread worklet function to valid Hermes Bytecode (HBC)', async () => {
    const code = `
      const factor = 10
      export function calculate(val: number) {
        'worklet'
        return val * factor
      }
    `
    const result = await transformWorklets('/app/calculate.ts', code, false)
    const match = result.code.match(/code:\s*"([^"]+)"/)
    expect(match).toBeDefined()
    const uiCode = JSON.parse(`"${match![1]}"`)

    // Verify Hermes bytecode compilation via hermesc if available
    const { execFileSync } = await import('node:child_process')
    const hermescPath = path.resolve(
      __dirname,
      '../../../node_modules/hermes-compiler/hermesc/osx-bin/hermesc'
    )
    if (fs.existsSync(hermescPath)) {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-worklet-test-'))
      const jsPath = path.join(tempDir, 'worklet.js')
      const hbcPath = path.join(tempDir, 'worklet.hbc')
      try {
        fs.writeFileSync(jsPath, `(${uiCode})`)
        execFileSync(hermescPath, ['-emit-binary', '-out', hbcPath, jsPath])
        expect(fs.existsSync(hbcPath)).toBe(true)
        expect(fs.statSync(hbcPath).size).toBeGreaterThan(0)
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    }
  })

  it('transforms multiple worklets in the same file with independent closures', async () => {
    const code = `
      const a = 10
      const b = 20
      export function first() {
        'worklet'
        return a
      }
      export function second() {
        'worklet'
        return b
      }
    `
    const result = await transformWorklets('/app/multiple.ts', code, false)
    expect(result.code).toContain('first')
    expect(result.code).toContain('second')
    expect(result.code).toContain('__closure = { a: a }')
    expect(result.code).toContain('__closure = { b: b }')
  })

  it('transforms concise arrow functions with useDerivedValue', async () => {
    const code = `
      import { useDerivedValue } from 'react-native-reanimated'
      const multiplier = 3
      export const derived = useDerivedValue(() => multiplier * 10)
    `
    const result = await transformWorklets('/app/derived.ts', code, false)
    expect(result.code).toContain('__workletHash')
    expect(result.code).toContain('multiplier')
  })

  it('transforms scroll handler with object methods', async () => {
    const code = `
      import { useAnimatedScrollHandler } from 'react-native-reanimated'
      const offset = 5
      export const handler = useAnimatedScrollHandler({
        onScroll(event) {
          'worklet'
          return event.contentOffset.y + offset
        }
      })
    `
    const result = await transformWorklets('/app/handler.ts', code, false)
    expect(result.code).toContain('onScroll:')
    expect(result.code).toContain('__closure = { offset: offset }')
  })

  it('correctly handles default and destructuring parameters in closure capture', async () => {
    const code = `
      const factor = 4
      export function compute({ x, y = 1 }: { x: number; y?: number }, z = 0) {
        'worklet'
        return (x + y + z) * factor
      }
    `
    const result = await transformWorklets('/app/destructure.ts', code, false)
    expect(result.code).toContain('__closure = { factor: factor }')

    const sandbox = { global: globalThis, exports: {} as any }
    const runner = new Function(
      'exports',
      'global',
      result.code.replace('export var compute', 'exports.compute')
    )
    runner(sandbox.exports, sandbox.global)

    const computeFn = sandbox.exports.compute
    expect(computeFn({ x: 2 })).toBe(12) // (2 + 1 + 0) * 4 = 12

    const reconstructed = eval(`(${computeFn.__initData.code})`)
    const uiRes = reconstructed.call({ __closure: computeFn.__closure }, { x: 2, y: 3 }, 5)
    expect(uiRes).toBe(40) // (2 + 3 + 5) * 4 = 40
  })

  it('operates with 100% elimination of SWC (zero swc dependencies in transformWorklets)', async () => {
    const fs = await import('node:fs')
    const transformWorkletsSource = fs.readFileSync(
      path.resolve(__dirname, 'transformWorklets.ts'),
      'utf-8'
    )
    expect(transformWorkletsSource).not.toContain('@swc/core')
    expect(transformWorkletsSource).not.toContain('@react-native-swc/worklets-plugin')

    const result = await transformWorklets(
      '/app/zeroSwc.ts',
      `export function zeroSwc() { 'worklet'; return 999; }`,
      false
    )
    expect(result.code).toContain('__workletHash')
    expect(result.code).toContain('__pluginVersion')
    expect(result.code).toContain('999')
  })

  it('correctly handles lexical block scope shadowing without losing outer bindings', async () => {
    const code = `
      const x = 7
      export function f() {
        'worklet'
        {
          const x = 1
        }
        return x
      }
    `
    const result = await transformWorklets('/app/scope-shadow.ts', code, false)
    expect(result.code).toContain('__closure = { x: x }')

    const sandbox = { global: globalThis, exports: {} as any }
    const runner = new Function(
      'exports',
      'global',
      result.code.replace('export var f', 'exports.f')
    )
    runner(sandbox.exports, sandbox.global)
    const f = sandbox.exports.f
    expect(f()).toBe(7)

    const reconstructed = eval(`(${f.__initData.code})`)
    const uiRes = reconstructed.call({ __closure: f.__closure })
    expect(uiRes).toBe(7)
  })

  it('transforms nested worklets with bottom-up composition', async () => {
    const code = `
      export function outer() {
        'worklet'
        function inner() {
          'worklet'
          return 1
        }
        return inner()
      }
    `
    const result = await transformWorklets('/app/nested.ts', code, false)
    expect(result.code).toContain('export var outer')
    expect(result.code).toContain('inner.__workletHash')
    expect(result.code).toContain('outer.__workletHash')

    const sandbox = { global: globalThis, exports: {} as any }
    const runner = new Function(
      'exports',
      'global',
      result.code.replace('export var outer', 'exports.outer')
    )
    runner(sandbox.exports, sandbox.global)
    const outerFn = sandbox.exports.outer
    expect(outerFn()).toBe(1)
  })

  it('transforms modules with >50 sibling worklets without truncation', async () => {
    const fnCount = 60
    const code = Array.from(
      { length: fnCount },
      (_, i) => `export function f${i}() { 'worklet'; return ${i}; }`
    ).join('\n')

    const result = await transformWorklets('/app/many.ts', code, false)

    for (let i = 0; i < fnCount; i++) {
      expect(result.code).toContain(`export var f${i} =`)
      expect(result.code).toContain(`f${i}.__workletHash`)
    }

    // Verify last worklet (f59) is transformed and executable
    const sandbox = { global: globalThis, exports: {} as any }
    const runner = new Function(
      'exports',
      'global',
      result.code.replace(/export var /g, 'exports.')
    )
    runner(sandbox.exports, sandbox.global)
    expect(sandbox.exports.f0()).toBe(0)
    expect(sandbox.exports.f50()).toBe(50)
    expect(sandbox.exports.f59()).toBe(59)
  })

  it('transforms deeply nested worklets (3 levels) bottom-up', async () => {
    const code = `
      export function level1() {
        'worklet';
        function level2() {
          'worklet';
          function level3() {
            'worklet';
            return 42;
          }
          return level3();
        }
        return level2();
      }
    `
    const result = await transformWorklets('/app/deep.ts', code, false)
    expect(result.code).toContain('level3.__workletHash')
    expect(result.code).toContain('level2.__workletHash')
    expect(result.code).toContain('level1.__workletHash')

    const sandbox = { global: globalThis, exports: {} as any }
    const runner = new Function(
      'exports',
      'global',
      result.code.replace('export var level1', 'exports.level1')
    )
    runner(sandbox.exports, sandbox.global)
    expect(sandbox.exports.level1()).toBe(42)
  })
})




describe('worklet detection gate', () => {
  it('accepts files whose only worklets come from gesture callbacks', () => {
    // .onBegin/.onEnd/.onTouchesMove are auto-workletized by the transform, so
    // a gate that misses them ships those callbacks untransformed.
    configureVXRNCompilerPlugin({ enableReanimated: true, enableNativeWorklets: true })
    const code = `
      const tap = Gesture.Tap().onBegin((e) => { setState(e) }).onTouchesMove((e) => {}).onEnd(() => {})
    `
    expect(shouldTransformWorklets({ id: '/app/gesture.native.js', code })).toBe(true)
  })
})
