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
