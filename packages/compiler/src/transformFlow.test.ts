import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping'
import { parseSync } from 'oxc-parser'
import { transformSync } from 'oxc-transform'
import { describe, expect, it, vi } from 'vitest'
import { transformBabel } from './transformBabel'
import { stripFlowTypes } from './transformFlow'
import { transformHermesClasses } from './transformHermesClasses'

vi.mock('@babel/core', () => ({
  default: {
    transform() {
      throw new Error('babel reached native transform')
    },
    transformAsync() {
      throw new Error('babel reached native transform')
    },
  },
}))

const require = createRequire(import.meta.url)

describe('native transforms preserve Flow runtime behavior without Babel', () => {
  it('rejects the old Babel path as its negative control', async () => {
    await expect(transformBabel('control.js', 'const value = 1', {})).rejects.toThrow(
      'babel reached native transform'
    )
  })

  it.each([
    'enum State { Ready = 1, Busy = 2 }',
    'enum State { Ready, Busy }',
    'enum State of symbol { Ready, Busy }',
    'enum State of boolean { Ready = true, Busy = false }',
  ])(
    'preserves enum methods, readonly types, defaults and mappings: %s',
    async (enumSource) => {
      const source = [
        '// @flow',
        'type Input = { readonly value: number };',
        enumSource,
        'function value(input: Input = {value: 42}): number {',
        '  return input.value;',
        '}',
        'globalThis.result = { value: value(), State };',
      ].join('\n')
      const result = await stripFlowTypes('flow.js', source)
      expect(parseSync('flow.js', result.code).errors).toEqual([])
      const context: any = { require }
      runInNewContext(result.code, context)
      expect(context.result.value).toBe(42)
      const { State } = context.result
      expect(State.isValid(State.Ready)).toBe(true)
      expect(State.isValid('invalid')).toBe(false)
      expect(State.cast(State.Busy)).toBe(State.Busy)
      expect(State.getName(State.Ready)).toBe('Ready')
      expect(Array.from(State.members())).toEqual([State.Ready, State.Busy])
      expect(Object.keys(State)).toEqual([])
      expect(Object.isFrozen(State)).toBe(true)
      const lines = result.code.split('\n')
      const line = lines.findIndex((text) => text.includes('input.value'))
      const position = originalPositionFor(new TraceMap(result.map), {
        line: line + 1,
        column: lines[line].indexOf('input.value'),
      })
      expect(position.source).toBe('flow.js')
      expect(position.line).toBe(5)
      expect(result.map.sourcesContent).toEqual([source])
    }
  )

  it('retains named and default enum exports and JSX for the native bundler', async () => {
    for (const prefix of ['export', 'export default']) {
      const result = await stripFlowTypes(
        'View.js',
        `${prefix} enum State {Ready, Busy}
         export function View(props: {value: string}) { return <NativeView {...props} /> }`
      )
      expect(parseSync('View.jsx', result.code, { lang: 'jsx' }).errors).toEqual([])
    }
  })

  it('erases Flow field declarations before Hermes class lowering to preserve prototype constants', async () => {
    const source = `class Event {
      static +NONE: 0;
      +NONE: 0;
      value: number = 42;
    }
    Object.defineProperty(Event, 'NONE', {value: 0});
    Object.defineProperty(Event.prototype, 'NONE', {value: 0});
    globalThis.result = new Event();
    globalThis.Event = Event;`
    const stripped = await stripFlowTypes('Event.js', source)
    const fields = transformSync('Event.js', stripped.code, {
      target: 'es2020',
      assumptions: { setPublicClassFields: true },
    })
    expect(fields.errors).toEqual([])
    const lowered = await transformHermesClasses(fields.code, 'Event.js', true)
    expect(lowered).toBeDefined()
    const context: any = {}
    runInNewContext(lowered!.code, context)
    expect(context.result.NONE).toBe(0)
    expect(context.Event.NONE).toBe(0)
    expect(Object.hasOwn(context.result, 'NONE')).toBe(false)
    expect(context.result.value).toBe(42)
  })

  it('lowers class hierarchies and parameter shadowing without Babel', async () => {
    const result = await transformHermesClasses(
      `class Base { value() { return 2 } }
       class Derived extends Base {
         constructor(value = 'default', ...rest) { super(); this.params = [value, ...rest] }
         value() { return super.value() + 3 }
       }
       function read(config) { if (true) { const config = 7; globalThis.inner = config } return config.id }
       globalThis.result = [new Derived().value(), read({id: 'device'})];
       globalThis.params = new Derived(undefined, 'rest-a', 'rest-b').params;
       globalThis.run = async (value = 2n) => await Promise.resolve(value);
       globalThis.pending = globalThis.run();`,
      'classes.js',
      true
    )
    expect(result).toBeDefined()
    const context: any = {}
    runInNewContext(result!.code, context)
    expect(Array.from(context.result)).toEqual([5, 'device'])
    expect(context.inner).toBe(7)
    expect(Array.from(context.params)).toEqual(['default', 'rest-a', 'rest-b'])
    expect(await context.pending).toBe(2n)
    expect(context.run.constructor.name).toBe('AsyncFunction')
  })
})
