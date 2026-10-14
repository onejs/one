import { runInNewContext } from 'node:vm'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildNativeBundle } from './createNativeDevEngine'

// the consumers finish loading in opposite orders, changing rolldown's module
// indices without changing the graph or its execution order.
async function bundle(order: string[], firstValue = 11) {
  const root = join(import.meta.dirname, '__determinism_fixture__')
  const files: Record<string, string> = {
    'entry.js': `import { a } from './consumer-a.js';
      import { b } from './consumer-b.js';
      import { c } from './consumer-c.js';
      import { d } from './consumer-d.js';
      globalThis.result = [a, b, c, d];`,
    'shared.cjs': `exports.a = ${firstValue}; exports.b = 22; exports.c = 33; exports.d = 44;`,
  }
  for (const name of ['a', 'b', 'c', 'd']) {
    files[`${name}.js`] = `export { ${name} } from './shared.cjs';`
    files[`consumer-${name}.js`] =
      `import { ${name} as value } from './${name}.js'; export const ${name} = value;`
  }
  const releases = new Map<string, () => void>()
  const parsed: string[] = []
  const result = await buildNativeBundle({
    root,
    entryFile: 'entry.js',
    platform: 'ios',
    minify: false,
    plugins: [
      {
        name: 'controlled-native-load-order',
        resolveId(source) {
          const file = source.slice(source.lastIndexOf('/') + 1)
          if (file in files) return join(root, file)
        },
        async load(id) {
          const file = id.slice(id.lastIndexOf('/') + 1)
          if (!(file in files)) return
          if (file.startsWith('consumer-')) {
            await new Promise<void>((resolve) => {
              releases.set(file[9], resolve)
              if (releases.size === order.length) releases.get(order[0])!()
            })
          }
          return { code: files[file], moduleSideEffects: false }
        },
        moduleParsed(info) {
          const file = info.id.slice(info.id.lastIndexOf('/') + 1)
          if (/^[abcd]\.js$/.test(file)) {
            parsed.push(file[0])
            releases.get(order[parsed.length])?.()
          }
        },
      },
    ],
  })
  expect(parsed).toEqual(order)
  const context: any = { console }
  runInNewContext(result.code, context)
  expect(Array.from(context.result)).toEqual([firstValue, 22, 33, 44])
  return result.code
}

describe('native bundle determinism', () => {
  it('keeps CJS re-export bindings stable across load completion orders', async () => {
    const forward = ['a', 'b', 'c', 'd']
    const reverse = [...forward].reverse()
    const first = await bundle(forward)
    expect(await bundle(reverse)).toBe(first)
    expect(await bundle(forward)).toBe(first)
  })

  it('changes bytes and the evaluated value when a CJS input changes', async () => {
    const order = ['a', 'b', 'c', 'd']
    expect(await bundle(order, 55)).not.toBe(await bundle(order))
  })
})
