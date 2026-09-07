import { describe, expect, it } from 'vitest'
import { runInNewContext } from 'node:vm'
import { rolldown } from 'rolldown'
import { transformOxc, transformSWC, transformSWCStripJSX } from './transformSWC'

describe('transformSWC / transformOxc with oxc-transform for Hermes lowering', () => {
  it('preserves unbraced for-await bodies and early returns', async () => {
    const result = await transformSWC(
      'AsyncIterable.js',
      `
        async function collect(it) {
          const values = []
          for await (const value of it) values.push(value)
          return values
        }
        async function first(it) {
          for await (const value of it) return value
          return null
        }
        globalThis.result = Promise.all([collect([11, 22]), first([11, 22])])
      `,
      { environment: 'ios', mode: 'build', production: true }
    )
    expect(result).toBeDefined()
    const bundle = await rolldown({
      input: 'virtual:async-iterable.js',
      plugins: [
        {
          name: 'async-iterable-fixture',
          resolveId(id) {
            if (id === 'virtual:async-iterable.js') return id
          },
          load(id) {
            if (id === 'virtual:async-iterable.js') return result!.code
          },
        },
      ],
    })
    try {
      const output = await bundle.generate({ format: 'iife' })
      const context: { result?: Promise<unknown> } = {}
      runInNewContext(output.output[0].code, context)
      await expect(context.result).resolves.toEqual([[11, 22], 11])
    } finally {
      await bundle.close()
    }
  })

  it('lowers class fields, private fields, and static blocks with Hermes target and assumptions', async () => {
    const input = `
class Sample {
  #secret = 42
  publicField = 100
  static {
    Sample.initialized = true
  }
  getSecret() {
    return this.#secret
  }
}
`
    const res = await transformSWC('Sample.ts', input, {
      environment: 'ios',
      mode: 'build',
    })

    expect(res).toBeDefined()
    expect(res!.code).not.toContain('#secret')
    expect(res!.code).not.toMatch(/^\s*publicField\s*=/m)
    expect(res!.code).not.toContain('static {')
    expect(res!.code).toContain('this.publicField = 100')
  })

  it.each(['MyComponent.tsx', 'MyComponent.js', 'MyComponent.mjs', 'MyComponent.cjs'])('lowers JSX in %s to react automatic runtime calls', async (filename) => {
    const input = `
export function MyComponent() {
  return <div className="test"><span>Hello</span></div>
}
`
    const res = await transformSWC(filename, input, {
      environment: 'client',
      mode: 'build',
    })

    expect(res).toBeDefined()
    expect(res!.code).not.toContain('<div')
    expect(res!.code).not.toContain('<span>')
    expect(res!.code).toContain('_jsx')
  })

  it('respects sourcemaps option', async () => {
    const input = `
class Sample {
  val = 1
}
`
    const resWithoutMap = await transformSWC(
      'Sample.ts',
      input,
      {
        environment: 'ios',
        mode: 'build',
      },
      { sourceMaps: false }
    )
    expect(resWithoutMap?.map).toBeUndefined()

    const resWithMap = await transformSWC(
      'Sample.ts',
      input,
      {
        environment: 'ios',
        mode: 'build',
      },
      { sourceMaps: true }
    )
    expect(resWithMap?.map).toBeDefined()
    expect(resWithMap?.map.mappings).toBeDefined()
  })

  it('provides transformOxc alias', () => {
    expect(transformOxc).toBe(transformSWC)
  })

  it('strips JSX using transformSWCStripJSX', async () => {
    const input = `export const el = <div>Hello</div>`
    const res = await transformSWCStripJSX('el.tsx', input)
    expect(res).toBeDefined()
    expect(res!.code).not.toContain('<div>')
    expect(res!.code).toContain('_jsx')
  })
})
