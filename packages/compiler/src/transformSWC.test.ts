import { describe, expect, it } from 'vitest'
import { transformOxc, transformSWC, transformSWCStripJSX } from './transformSWC'

describe('transformSWC / transformOxc with oxc-transform for Hermes lowering', () => {
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

  it('lowers JSX to react automatic runtime calls', async () => {
    const input = `
export function MyComponent() {
  return <div className="test"><span>Hello</span></div>
}
`
    const res = await transformSWC('MyComponent.tsx', input, {
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
