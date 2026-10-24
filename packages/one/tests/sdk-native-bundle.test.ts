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
// errors when framework call prefixes are shared.
test('compact SDK calls preserve wrappers, descriptors and first-call errors', async () => {
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
