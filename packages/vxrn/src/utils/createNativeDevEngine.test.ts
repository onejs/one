import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rolldown } from 'rolldown'
import { dev } from 'rolldown/experimental'
import { describe, expect, it } from 'vitest'
import {
  buildNativeBundle,
  getHermesSWCIncludes,
  getHmrRuntimeSource,
  getNativeTransformConfig,
  hermesCompatSWCPlugin,
  hmrClientNoopPlugin,
  vxrnCompilerPlugin,
  wrapNativeBundleModuleScope,
} from './createNativeDevEngine'

const nativeTransformProbe = `
export const transformProbe = () => {
  'worklet'
  return 'transformed'
}
`

async function createThrowingWorkletsProject() {
  const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-transform-failure-'))
  const packageRoot = join(testRoot, 'node_modules/react-native-worklets')
  await mkdir(packageRoot, { recursive: true })
  await writeFile(
    join(packageRoot, 'package.json'),
    JSON.stringify({ name: 'react-native-worklets' })
  )
  await writeFile(
    join(packageRoot, 'plugin.js'),
    `module.exports = () => ({
      visitor: {
        Program() {
          throw new Error('NATIVE_TRANSFORM_NEGATIVE_CONTROL')
        }
      }
    })`
  )
  await writeFile(join(testRoot, 'entry.ts'), nativeTransformProbe)
  return testRoot
}

describe('native Rolldown HMR runtime', () => {
  it(
    'registers a Rolldown 1.2 client and applies a self-accepted patch',
    { timeout: 30_000 },
    async () => {
      const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-native-hmr-'))
      const entry = join(testRoot, 'entry.js')
      const source = (version: string) => `
globalThis.__vxrnHmrBody = '${version}'
export const value = '${version}'
if (import.meta.hot) {
  import.meta.hot.accept((next) => {
    globalThis.__vxrnHmrAccepted = next.value
  })
}
`
      await writeFile(entry, source('v1'))

      let resolveInitialOutput!: (output: any) => void
      const initialOutput = new Promise<any>((resolve) => {
        resolveInitialOutput = resolve
      })
      let resolveHmrUpdate!: (output: any) => void
      const hmrUpdate = new Promise<any>((resolve) => {
        resolveHmrUpdate = resolve
      })
      let registeredClientId: string | undefined
      const engine = await dev(
        {
          cwd: testRoot,
          input: entry,
          experimental: { devMode: { implement: getHmrRuntimeSource() } },
        },
        { format: 'esm' },
        {
          onOutput(result) {
            resolveInitialOutput(result)
          },
          onHmrUpdates(result) {
            if (
              !(result instanceof Error) &&
              result.updates.some(
                (item) =>
                  item.clientId === registeredClientId && item.update.type === 'Patch'
              )
            ) {
              resolveHmrUpdate(result)
            }
          },
        }
      )

      try {
        await engine.run()
        const initial = await initialOutput
        if (initial instanceof Error) throw initial
        const chunk = initial.output.find(
          (item: any) => item.type === 'chunk' && item.isEntry
        )
        expect(chunk).toBeTruthy()

        delete (globalThis as any).__rolldown_runtime__
        await import(
          `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`
        )
        const runtime = (globalThis as any).__rolldown_runtime__
        expect(typeof runtime.clientId).toBe('string')
        registeredClientId = runtime.clientId
        await engine.registerClient(runtime.clientId)

        await writeFile(entry, source('v2'))
        const result = await Promise.race([
          hmrUpdate,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timed out waiting for HMR patch')), 10_000)
          ),
        ])
        const patch = result.updates.find(
          (item: any) =>
            item.clientId === runtime.clientId && item.update.type === 'Patch'
        )?.update
        expect(patch).toBeTruthy()

        expect(runtime.applyHmrUpdate(patch.code, patch.changedIds, patch.seq)).toBe(true)
        expect((globalThis as any).__vxrnHmrBody).toBe('v2')
        expect((globalThis as any).__vxrnHmrAccepted).toBe('v2')
      } finally {
        await engine.close()
        await rm(testRoot, { recursive: true, force: true })
        delete (globalThis as any).__rolldown_runtime__
        delete (globalThis as any).__vxrnHmrBody
        delete (globalThis as any).__vxrnHmrAccepted
      }
    }
  )
})

// use a root with no .env files so only the platform defines are present
const root = '/tmp/vxrn-native-env-define-test-nonexistent'

describe('getNativeTransformConfig platform env defines', () => {
  for (const platform of ['ios', 'android'] as const) {
    for (const dev of [true, false]) {
      it(`injects TAMAGUI_TARGET=native for ${platform} (dev=${dev})`, () => {
        const { define } = getNativeTransformConfig(platform, dev, root)

        // regression: TAMAGUI_TARGET was missing from the rolldown native defines,
        // so import.meta.env.TAMAGUI_TARGET resolved to '' in prod (metro had it, rolldown didn't)
        expect(define['import.meta.env.TAMAGUI_TARGET']).toBe('"native"')
        expect(define['process.env.TAMAGUI_TARGET']).toBe('"native"')
        expect(define['import.meta.env.TAMAGUI_ENVIRONMENT']).toBe(
          JSON.stringify(platform)
        )

        // sibling platform vars that already worked — guard against accidental removal
        expect(define['import.meta.env.VITE_ENVIRONMENT']).toBe(JSON.stringify(platform))
        expect(define['import.meta.env.VITE_NATIVE']).toBe('"1"')
        expect(define['import.meta.env.EXPO_OS']).toBe(JSON.stringify(platform))

        // the whole import.meta.env object (used by JSON.stringify(import.meta.env)) must carry it too
        const envObject = JSON.parse(define['import.meta.env'] as string)
        expect(envObject.TAMAGUI_TARGET).toBe('native')
        expect(envObject.TAMAGUI_ENVIRONMENT).toBe(platform)
      })
    }
  }
})

describe('wrapNativeBundleModuleScope', () => {
  // matches the marker rolldown dev() emits at the start of the runtime region
  const RUNTIME_MARKER = '//#region \\0rolldown/runtime.js'

  it('wraps module code after the prelude so top-level vars do not leak to global', () => {
    const prelude = 'globalThis.global = globalThis;\nglobalThis.__DEV__ = true;\n'
    // a top-level `var Headers` in a script becomes a non-configurable global,
    // which is the exact leak that breaks RN's polyfillGlobal in dev
    const body = `${RUNTIME_MARKER}\nvar fetch_hot, fetch$1, Headers, Request, Response$1;\nglobalThis.__rolldown_runtime__ = {};\n`

    const out = wrapNativeBundleModuleScope(prelude + body)

    const openIdx = out.indexOf(';(function() {')
    expect(openIdx).toBeGreaterThan(-1)
    // prelude (global setup) stays at script scope, before the wrap opens
    expect(out.indexOf('globalThis.__DEV__')).toBeLessThan(openIdx)
    // the leaking declaration is now inside the function scope
    expect(out.indexOf('var fetch_hot')).toBeGreaterThan(openIdx)
    // and the result must still be syntactically valid (balanced wrap)
    expect(() => new Function(out)).not.toThrow()
  })

  it('is a no-op when the runtime marker is absent (e.g. prod bundle)', () => {
    const input = 'var x = 1;\nconsole.log(x);\n'
    expect(wrapNativeBundleModuleScope(input)).toBe(input)
  })
})

describe('getHermesSWCIncludes', () => {
  const CLASS_SET = [
    'transform-classes',
    'transform-parameters',
    'transform-class-properties',
    'transform-class-static-block',
    'transform-private-methods',
    'transform-private-property-in-object',
  ]

  it('always includes the full Hermes class-transform set (dev and prod)', () => {
    // regression: transform-classes was missing in dev, leaving a half-transpiled
    // class hierarchy Hermes crashes on at `new Subclass()`
    expect(getHermesSWCIncludes(true)).toEqual(expect.arrayContaining(CLASS_SET))
    expect(getHermesSWCIncludes(false)).toEqual(expect.arrayContaining(CLASS_SET))
  })

  it('adds transform-async-to-generator only in production', () => {
    expect(getHermesSWCIncludes(true)).not.toContain('transform-async-to-generator')
    expect(getHermesSWCIncludes(false)).toContain('transform-async-to-generator')
  })

  it('bundles lowered classes whose constructors use default and rest parameters', async () => {
    const testRoot = await mkdtemp(join(tmpdir(), 'vxrn-hermes-parameters-'))
    const entry = join(testRoot, 'entry.js')
    await writeFile(
      entry,
      `
class ParameterProbe {
  prefix = 'value'

  constructor(value = 'default', ...rest) {
    this.result = [this.prefix, value, ...rest].join(':')
  }
}

export const result = new ParameterProbe(undefined, 'rest-a', 'rest-b').result
`
    )

    const build = await rolldown({
      input: entry,
      plugins: [hermesCompatSWCPlugin(true)],
    })

    try {
      const output = await build.generate({ format: 'esm' })
      const chunk = output.output.find((item) => item.type === 'chunk')
      expect(chunk).toBeTruthy()
      if (!chunk) throw new Error('Rolldown did not emit a JavaScript chunk')

      const module = await import(
        `data:text/javascript;base64,${Buffer.from(chunk.code).toString('base64')}`
      )
      expect(module.result).toBe('value:default:rest-a:rest-b')
    } finally {
      await build.close()
      await rm(testRoot, { recursive: true, force: true })
    }
  })
})

describe('hmrClientNoopPlugin', () => {
  const plugin = hmrClientNoopPlugin()
  const resolveId = plugin.resolveId as unknown as (
    source: string,
    importer?: string
  ) => any
  const load = plugin.load as unknown as (id: string) => any
  const VIRTUAL_ID = '\0vxrn-hmr-client-noop'

  it.each([
    ['react-native/Libraries/Utilities/HMRClient', undefined],
    ['../Utilities/HMRClient', '/project/node_modules/react-native/Libraries/Core.js'],
    ['../../Utilities/HMRClient.js', '/project/react-native/Libraries/Core.js'],
    // native Windows ids use backslashes
    ['..\\Utilities\\HMRClient.js', 'C:\\project\\react-native\\Libraries\\Core.js'],
    ['../Utilities/HMRClient.ts', '/project/node_modules/react-native/Core.js'],
    ['../Utilities/HMRClient.tsx', '/project/node_modules/react-native/Core.js'],
    ['../Utilities/HMRClient.cjs', '/project/node_modules/react-native/Core.js'],
  ])(
    'aliases RN HMRClient specifier %j to the no-op virtual module',
    (source, importer) => {
      expect(resolveId(source, importer)).toEqual({ id: VIRTUAL_ID, external: false })
    }
  )

  it.each([
    // trailing letters (no boundary) must not match
    'react-native/Libraries/Utilities/HMRClientRegistry',
    // the Utilities segment must start at a path boundary
    'some/MyUtilities/HMRClient',
    // unrelated RN modules
    'react-native/Libraries/Core/setUpDeveloperTools',
    'react',
  ])('does not touch unrelated specifier %j', (source) => {
    expect(resolveId(source)).toBeUndefined()
  })

  it('does not alias an app-authored Utilities/HMRClient module', () => {
    expect(resolveId('../Utilities/HMRClient', '/project/src/App.tsx')).toBeUndefined()
  })

  it('loads a no-op module exposing every HMRClient method RN calls', () => {
    const result = load(VIRTUAL_ID)
    expect(result?.moduleType).toBe('js')
    for (const method of [
      'setup',
      'enable',
      'disable',
      'registerBundle',
      'log',
      'isEnabled',
    ]) {
      expect(result!.code).toContain(method)
    }
    expect(result!.code).toContain('export default HMRClient')
  })

  it('does not load unrelated ids', () => {
    expect(load('\0some-other-virtual')).toBeUndefined()
  })
})

describe('vxrnCompilerPlugin React Refresh registration', () => {
  it('keeps initial-bundle registrations visible to rolldown', async () => {
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'test'
    try {
      const plugin = vxrnCompilerPlugin('ios', true)
      const transform = plugin.transform as (code: string, id: string) => Promise<any>
      const result = await transform(
        'export const marker = "$RefreshReg$("; export function Probe() { return <div>probe</div> }',
        '/project/src/Probe.tsx'
      )
      const code = result.code as string

      expect(code).toContain('var __vxrnRefreshReg = globalThis.$RefreshReg$')
      expect(code).toContain('__vxrnRefreshReg(')
      expect(code).toContain('"$RefreshReg$("')
    } finally {
      process.env.NODE_ENV = previousNodeEnv
    }
  })
})

describe('native required transform failures', () => {
  it.each([true, false])(
    'rejects valid worklet source when its required compiler transform fails (dev=%s)',
    async (dev) => {
      const testRoot = await createThrowingWorkletsProject()
      const compiler = await import('@vxrn/compiler')
      compiler.configureVXRNCompilerPlugin({ enableReanimated: true })

      try {
        const plugin = vxrnCompilerPlugin('ios', dev, testRoot)
        if (typeof plugin.transform !== 'function') {
          throw new Error('vxrn compiler transform hook is not callable')
        }

        await expect(
          Reflect.apply(plugin.transform, undefined, [
            nativeTransformProbe,
            join(testRoot, 'entry.ts'),
          ])
        ).rejects.toThrow('NATIVE_TRANSFORM_NEGATIVE_CONTROL')
      } finally {
        compiler.configureVXRNCompilerPlugin({ enableReanimated: false })
        await rm(testRoot, { recursive: true, force: true })
      }
    }
  )

  it('returns a dev build error and no output when the required compiler transform fails', async () => {
    const testRoot = await createThrowingWorkletsProject()
    const compiler = await import('@vxrn/compiler')
    compiler.configureVXRNCompilerPlugin({ enableReanimated: true })
    let resolveOutput!: (output: unknown) => void
    const output = new Promise<unknown>((resolve) => {
      resolveOutput = resolve
    })
    const engine = await dev(
      {
        cwd: testRoot,
        input: join(testRoot, 'entry.ts'),
        plugins: [vxrnCompilerPlugin('ios', true, testRoot)],
      },
      { format: 'esm' },
      { onOutput: resolveOutput }
    )

    try {
      await engine.run()
      const result = await output
      expect(result).toBeInstanceOf(Error)
      expect(String(result)).toContain('NATIVE_TRANSFORM_NEGATIVE_CONTROL')
    } finally {
      await engine.close()
      compiler.configureVXRNCompilerPlugin({ enableReanimated: false })
      await rm(testRoot, { recursive: true, force: true })
    }
  })

  it('emits no production bundle when the required compiler transform fails', async () => {
    const testRoot = await createThrowingWorkletsProject()
    const compiler = await import('@vxrn/compiler')
    compiler.configureVXRNCompilerPlugin({ enableReanimated: true })

    try {
      await expect(
        buildNativeBundle({
          root: testRoot,
          platform: 'ios',
          entryFile: 'entry.ts',
        })
      ).rejects.toThrow('NATIVE_TRANSFORM_NEGATIVE_CONTROL')
    } finally {
      compiler.configureVXRNCompilerPlugin({ enableReanimated: false })
      await rm(testRoot, { recursive: true, force: true })
    }
  })

  it('rejects Hermes compatibility transform errors instead of returning source', async () => {
    const plugin = hermesCompatSWCPlugin(true)
    if (typeof plugin.transform !== 'function') {
      throw new Error('Hermes compatibility transform hook is not callable')
    }

    await expect(
      Reflect.apply(plugin.transform, undefined, [
        'class TransformProbe { value = ; }',
        '/project/TransformProbe.ts',
      ])
    ).rejects.toBeTruthy()
  })
})
