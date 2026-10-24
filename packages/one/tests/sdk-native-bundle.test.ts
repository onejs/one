import { expect, test } from 'vitest'
import { rolldown } from 'rolldown'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

test('a tree-shaken native SDK import keeps its lazy native registration', async () => {
  const runtime = resolve(import.meta.dirname, '../src/ios-runtime.native.ts')
  const bundle = await rolldown({
    input: 'sdk-bundle-entry',
    external: ['react', 'react-native-nitro-modules'],
    plugins: [
      {
        name: 'sdk-bundle-entry',
        resolveId(id) {
          if (id === 'sdk-bundle-entry') return '\0sdk-bundle-entry'
        },
        load(id) {
          if (id === '\0sdk-bundle-entry') {
            return `import { callSDK } from ${JSON.stringify(runtime)};
            export function read() { return callSDK('probe', 0, undefined, []); }`
          }
        },
      },
    ],
  })

  try {
    const { output } = await bundle.generate({ format: 'cjs' })
    let creations = 0
    const exports: { read?: () => string } = {}
    runInNewContext(output[0].code, {
      exports,
      require(id: string) {
        if (id === 'react') return {}
        if (id !== 'react-native-nitro-modules')
          throw new Error(`unexpected import ${id}`)
        return {
          NitroModules: {
            createHybridObject(name: string) {
              expect(name).toBe('OneSDK')
              creations++
              return { call: () => 'native SDK ready' }
            },
          },
        }
      },
    })
    expect(creations).toBe(0)
    expect(exports.read!()).toBe('native SDK ready')
    expect(exports.read!()).toBe('native SDK ready')
    expect(creations).toBe(1)
  } finally {
    await bundle.close()
  }
})

// generated frameworks must preserve eager wrapper registration and first-call
// errors when their method bodies are lowered to tables.
test('compact SDK members preserve wrappers, descriptors and first-call errors', async () => {
  const { build } = await import('esbuild')
  const { compactFacade } = await import('../codegen/sdk/compact')
  const source = `
    import { SDKHandle, callSDK, callSDKAsync, registerSDKClass } from 'one/ios-runtime';
    export { setSDKNative, callSDKMethodAsync, observeSDKProperty } from 'one/ios-runtime';
    export class Parent extends SDKHandle {
      static get shared() { return callSDK('Probe', 1, undefined, []); }
      get child() { return callSDK('Probe', 2, this, []); }
      get count() { return callSDK('Probe', 3, this, []); }
      set count(value: number) { callSDK('Probe', 4, this, [value]); }
      fetch(value: string) { return callSDKAsync('Probe', 5, this, [value]); }
      withOut(value: string) { return callSDK('Probe', 6, this, [value, null]); }
    }
    export class Child extends Parent {}
    export const Value = {
      get zero() { return callSDK('Probe', 7, undefined, []); },
      read($self: string) { return callSDK('Probe', 8, $self, []); }
    };
    registerSDKClass('Probe.Parent', Parent, { module: 'Probe', properties: {"count":3}, methods: {"fetch":{"id":5},"withOut":{"id":6,"args":[0,null]}} });
    registerSDKClass('Probe.Child', Child, { module: 'Probe', properties: {} });
  `
  type Handle = { typeName: string; identity?: string }
  type ObjectHandle = {
    child: ObjectHandle
    count: number
    fetch: (value: string) => Promise<string>
    withOut: (value: string) => null
  }
  type Facade = {
    Parent: {
      new (handle: Handle): ObjectHandle
      readonly shared: ObjectHandle
      prototype: ObjectHandle
    }
    Child: new (handle: Handle) => ObjectHandle
    Value: { readonly zero: number; read: (self: string) => string }
    setSDKNative: (native: unknown) => void
    callSDKMethodAsync: (
      object: ObjectHandle,
      name: 'fetch',
      value: string
    ) => Promise<string>
    observeSDKProperty: (
      object: ObjectHandle,
      name: 'count',
      callback: (value: number) => void
    ) => unknown
  }
  const results: unknown[] = []
  for (const compact of [false, true]) {
    const compiled = await build({
      stdin: {
        contents: compact ? compactFacade(source) : source,
        loader: 'ts',
        resolveDir: import.meta.dirname,
      },
      plugins: [
        {
          name: 'probe-sdk-runtime',
          setup(build) {
            build.onResolve({ filter: /^one\/ios-runtime$/ }, () => ({
              path: resolve(import.meta.dirname, '../src/ios-runtime.ts'),
            }))
          },
        },
      ],
      bundle: true,
      format: 'cjs',
      platform: 'node',
      write: false,
      minify: true,
      keepNames: true,
    })
    const exported = { exports: {} }
    runInNewContext(compiled.outputFiles[0].text, {
      module: exported,
      exports: exported.exports,
      WeakRef,
      FinalizationRegistry,
    })
    const facade = exported.exports as Facade
    expect(() => facade.Parent.shared).toThrow('iOS SDK bindings need a native iOS build')
    const object = new facade.Parent({ typeName: 'Probe.Parent' })
    await expect(object.fetch('first')).rejects.toThrow(
      'iOS SDK bindings need a native iOS build'
    )
    const calls: unknown[][] = []
    facade.setSDKNative({
      call(...args: unknown[]) {
        calls.push(args)
        switch (args[1]) {
          case 1:
            return { typeName: 'Probe.Parent' }
          case 2:
            return { typeName: 'Probe.Child' }
          case 3:
            return 12
          case 7:
            return 0
          case 8:
            return args[2]
          default:
            return null
        }
      },
      callAsync(...args: unknown[]) {
        calls.push(args)
        return Promise.resolve('ok')
      },
      observe(...args: unknown[]) {
        calls.push(args)
        return () => {}
      },
    })
    const shared = facade.Parent.shared
    expect(shared).toBeInstanceOf(facade.Parent)
    expect(shared.child).toBeInstanceOf(facade.Child)
    expect(shared.child).toBeInstanceOf(facade.Parent)
    expect(shared.count).toBe(12)
    const setter = Object.getOwnPropertyDescriptor(facade.Parent.prototype, 'count')!.set!
    expect(setter.call(shared, 4)).toBeUndefined()
    expect(await shared.fetch('value')).toBe('ok')
    expect(await facade.callSDKMethodAsync(shared, 'fetch', 'background')).toBe('ok')
    facade.observeSDKProperty(shared, 'count', () => {})
    expect(facade.Value.zero).toBe(0)
    expect(facade.Value.read('value')).toBe('value')
    const descriptors = Object.fromEntries(
      Object.entries(Object.getOwnPropertyDescriptors(facade.Parent.prototype))
        .filter(([name]) => name !== 'constructor')
        .map(([name, descriptor]) => [
          name,
          {
            enumerable: descriptor.enumerable,
            configurable: descriptor.configurable,
            writable: descriptor.writable,
            methods: [descriptor.value, descriptor.get, descriptor.set].map((fn) =>
              typeof fn === 'function' ? [fn.name, fn.length] : null
            ),
          },
        ])
    )
    results.push({
      calls: JSON.stringify(calls, (_key, value) =>
        typeof value === 'function' ? '$callback' : value
      ),
      descriptors,
    })
  }
  expect(results[1]).toEqual(results[0])
})

// exercise lazy modules against the real wire registry, including first-use order.
test('lazy frameworks preserve registry lookups, cycles and cached failures', async () => {
  const { build, transform } = await import('esbuild')
  const { lazyFacade } = await import('../codegen/sdk/lazy')
  const runtime = (
    await build({
      entryPoints: [resolve(import.meta.dirname, '../src/ios-runtime.ts')],
      bundle: true,
      format: 'cjs',
      platform: 'node',
      write: false,
      external: ['react'],
    })
  ).outputFiles[0].text
  const base = `
    import { SDKHandle, callSDK, registerSDKClass, registerSDKProtocol } from 'one/ios-runtime';
    globalThis.runs.push('Base');
    export class Parent extends SDKHandle {
      static get shared() { return callSDK('Base', 1, undefined, []); }
      get count() { return callSDK('Base', 2, this, []); }
    }
    export class Child extends Parent {}
    registerSDKClass('Probe.Parent', Parent, { module:'Base', properties:{"count":2} });
    registerSDKClass('Probe.Child', Child, { module:'Base', properties:{} });
    registerSDKProtocol('Probe.Protocol', {"run":"run()"});
  `
  const extension = `
    import { SDKHandle, callSDK, registerSDKClass } from 'one/ios-runtime';
    globalThis.runs.push('Extension');
    export class Parent extends SDKHandle {
      extra(value: string) { return callSDK('Extension', 3, this, [value]); }
    }
    registerSDKClass('Probe.Parent', Parent, { module:'Extension', properties:{}, methods:{"extra":{"id":3}} }, true);
  `
  const sources: Record<string, string> = {
    'one/ios-runtime': runtime,
    Base: await lazyFacade(base, 'Base'),
    Extension: await lazyFacade(extension, 'Extension'),
    Broken: await lazyFacade(
      `
      import { SDKHandle, registerSDKClass } from 'one/ios-runtime';
      globalThis.runs.push('Broken'); throw globalThis.failure;
      export class Broken extends SDKHandle {}
      registerSDKClass('Probe.Broken', Broken);
    `,
      'Broken'
    ),
    CycleA: await lazyFacade(
      `
      globalThis.runs.push('CycleA');
      export const a = {}; export const fromB = require('CycleB').b;
    `,
      'CycleA'
    ),
    CycleB: await lazyFacade(
      `
      globalThis.runs.push('CycleB');
      export const b = require('CycleA').a;
    `,
      'CycleB'
    ),
    root: (
      await transform(
        `
      import { Parent } from 'Base'; import * as ns from 'Base';
      export * from 'Base'; export { ns };
      export function shared() { return Parent.shared; }
    `,
        { loader: 'js', format: 'cjs' }
      )
    ).code,
  }
  function environment() {
    const cache = new Map<string, { exports: any }>()
    const runs: string[] = [],
      calls: unknown[][] = []
    const failure = new Error('broken native constant')
    function require(id: string): any {
      if (id === 'react') return {}
      if (cache.has(id)) return cache.get(id)!.exports
      const module = { exports: {} }
      cache.set(id, module)
      runInNewContext(sources[id], {
        module,
        exports: module.exports,
        require,
        runs,
        failure,
      })
      return module.exports
    }
    const wire = require('one/ios-runtime')
    wire.setSDKNative({
      call: (...args: unknown[]) => {
        calls.push(args)
        return args[1] === 1 ? { typeName: 'Probe.Child' } : args[1] === 2 ? 42 : 'extra'
      },
      callAsync: async (...args: unknown[]) => {
        calls.push(args)
        return 'background'
      },
      observe: (...args: unknown[]) => {
        calls.push(args)
        return () => {}
      },
    })
    return { require, wire, runs, calls, failure }
  }
  for (const first of ['handle', 'static', 'protocol']) {
    const e = environment()
    e.require('Extension')
    const root = e.require('root')
    expect(Object.keys(root)).toContain('Parent')
    expect(e.runs).toEqual([])
    if (first === 'protocol')
      e.wire.callSDK(
        'Probe',
        4,
        undefined,
        [{ run() {} }],
        [{ protocol: 'Probe.Protocol' }]
      )
    const object =
      first === 'static'
        ? root.shared()
        : e.wire.decodeSDKResult({ typeName: 'Probe.Child' })
    expect(e.runs).toEqual(['Base', 'Extension'])
    expect(typeof root.Parent).toBe('function')
    expect(root.ns.Parent).toBe(root.Parent)
    expect(object instanceof root.Child).toBe(true)
    expect(object instanceof root.Parent).toBe(true)
    expect(object.count).toBe(42)
    expect(object.extra('value')).toBe('extra')
    expect(await e.wire.callSDKMethodAsync(object, 'extra', 'value')).toBe('background')
    e.wire.observeSDKProperty(
      object,
      'count',
      () => {},
      () => {}
    )()
    expect(e.runs).toEqual(['Base', 'Extension'])
    expect(
      Object.getOwnPropertyDescriptor(root.Parent.prototype, 'count')?.get?.name
    ).toBe('get count')
    expect(e.wire.decodeSDKResult({ typeName: 'Unreached' }).constructor).toBe(
      e.wire.SDKHandle
    )
  }
  const e = environment()
  const a = e.require('CycleA'),
    b = e.require('CycleB')
  expect(e.runs).toEqual([])
  expect(a.fromB).toBe(a.a)
  expect(b.b).toBe(a.a)
  expect(e.runs).toEqual(['CycleA', 'CycleB'])
  const broken = e.require('Broken')
  expect(Object.keys(broken)).toEqual(['Broken'])
  for (const access of [
    () => broken.Broken,
    () => broken.Broken,
    () => e.wire.decodeSDKResult({ typeName: 'Probe.Broken' }),
  ]) {
    let error: unknown
    try {
      access()
    } catch (caught) {
      error = caught
    }
    expect(error).toBe(e.failure)
  }
  expect(e.runs.filter((name) => name === 'Broken')).toHaveLength(1)
})
