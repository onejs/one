import { describe, expect, it } from 'vitest'
import * as vm from 'node:vm'
import { transformHermesLoops } from './transformHermesLoops'

/**
 * Hermes emits one CreateFunctionEnvironment before a loop rather than one per
 * iteration, and that environment covers the loop's head AND everything its
 * body declares, so every lexical binding under a loop behaves there exactly
 * like `var`. Rewriting them all that way reproduces Hermes on a spec-correct
 * runtime, which is what makes these assertions meaningful: every one of them
 * returns the wrong answer against the untransformed source.
 *
 * Verified against `hermesc -dump-bytecode`, which emits a single
 * CreateFunctionEnvironment before the loop and a StoreToEnvironment into the
 * same slot on each iteration.
 */
function runAsHermes(code: string) {
  const asHermesWouldSeeIt = code.replace(/\b(?:let|const)\b/g, 'var')
  const sandbox: any = { result: undefined, console }
  vm.runInNewContext(asHermesWouldSeeIt, sandbox)
  return sandbox.result
}

function run(source: string) {
  const out = transformHermesLoops(source, 'test.js')
  return runAsHermes(out ? out.code : source)
}

describe('transformHermesLoops', () => {
  it.each([
    ['if (false)', []],
    ['if (true)', [1, 2]],
    ['for (var pass = 0; pass < 2; pass++)', [1, 2, 1, 2]],
    ['while (passes++ < 2)', [1, 2, 1, 2]],
  ])('keeps a captured loop inside a single-statement %s body', (parent, expected) => {
    expect(
      run(`
        var fns = []
        var passes = 0
        ${parent} for (const n of [1, 2]) fns.push(() => n)
        result = fns.map((f) => f())
      `)
    ).toEqual(expected)
  })

  it.each([true, false])(
    'preserves if/else selection when the condition is %s',
    (condition) => {
      expect(
        run(`
        var fns = []
        if (${condition}) for (const n of [1, 2]) fns.push(() => n)
        else for (const n of [3, 4]) fns.push(() => n)
        result = fns.map((f) => f())
      `)
      ).toEqual(condition ? [1, 2] : [3, 4])
    }
  )

  it('preserves a do/while with a single-statement loop body', () => {
    expect(
      run(`
        var fns = []
        var passes = 0
        do for (const n of [1, 2]) fns.push(() => n)
        while (passes++ < 1)
        result = fns.map((f) => f())
      `)
    ).toEqual([1, 2, 1, 2])
  })

  it('guards optional Zero query patches through nested loop transforms', () => {
    expect(
      run(`
        var fns = []
        var parts = [{}, { desiredQueriesPatches: { a: ['x', 'y'], b: ['z'] } }]
        for (const part of parts) {
          if (part.desiredQueriesPatches)
            for (const [clientID, queriesPatch] of Object.entries(part.desiredQueriesPatches))
              for (const op of queriesPatch) fns.push(() => clientID + ':' + op)
        }
        result = fns.map((f) => f())
      `)
    ).toEqual(['a:x', 'a:y', 'b:z'])
  })

  it('gives a C-style loop a per-iteration binding', () => {
    expect(
      run(`
        var fns = []
        for (let i = 0; i < 3; i++) fns.push(() => i)
        result = fns.map((f) => f())
      `)
    ).toEqual([0, 1, 2])
  })

  it('gives for-of and for-in per-iteration bindings', () => {
    expect(
      run(`
        var fns = []
        for (const label of ['a', 'b']) fns.push(() => label)
        for (const key in { x: 1, y: 2 }) fns.push(() => key)
        result = fns.map((f) => f())
      `)
    ).toEqual(['a', 'b', 'x', 'y'])
  })

  it('preserves break', () => {
    expect(
      run(`
        var fns = []
        for (let i = 0; i < 10; i++) {
          if (i === 3) break
          fns.push(() => i)
        }
        result = fns.map((f) => f())
      `)
    ).toEqual([0, 1, 2])
  })

  it('preserves continue', () => {
    expect(
      run(`
        var fns = []
        for (let i = 0; i < 5; i++) {
          if (i % 2 === 0) continue
          fns.push(() => i)
        }
        result = fns.map((f) => f())
      `)
    ).toEqual([1, 3])
  })

  it('preserves return out of the enclosing function', () => {
    expect(
      run(`
        function find() {
          for (const n of [1, 2, 3]) {
            const get = () => n
            if (n === 2) return get()
          }
          return 'none'
        }
        result = find()
      `)
    ).toBe(2)
  })

  it('preserves a bare return', () => {
    expect(
      run(`
        var fns = []
        function go() {
          for (let i = 0; i < 5; i++) {
            if (i === 2) return
            fns.push(() => i)
          }
        }
        go()
        result = fns.map((f) => f())
      `)
    ).toEqual([0, 1])
  })

  it('leaves break and continue belonging to a nested loop alone', () => {
    expect(
      run(`
        var fns = []
        for (let i = 0; i < 2; i++) {
          for (var j = 0; j < 5; j++) {
            if (j > 0) break
          }
          fns.push(() => i)
        }
        result = fns.map((f) => f())
      `)
    ).toEqual([0, 1])
  })

  it('handles nested capturing loops', () => {
    expect(
      run(`
        var fns = []
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            fns.push(() => i + ':' + j)
          }
        }
        result = fns.map((f) => f())
      `)
    ).toEqual(['0:0', '0:1', '1:0', '1:1'])
  })

  it('handles await in the loop body', async () => {
    const out = transformHermesLoops(
      `
        var fns = []
        async function go() {
          for (const n of [1, 2]) {
            await Promise.resolve()
            fns.push(() => n)
          }
          return fns.map((f) => f())
        }
        result = go()
      `,
      'test.js'
    )
    expect(out).not.toBeNull()
    await expect(runAsHermes(out!.code)).resolves.toEqual([1, 2])
  })

  it('destructures a for-of binding per iteration', () => {
    expect(
      run(`
        var fns = []
        for (const { id } of [{ id: 'a' }, { id: 'b' }]) fns.push(() => id)
        result = fns.map((f) => f())
      `)
    ).toEqual(['a', 'b'])
  })

  it('rewrites the esbuild interop helper that broke every multi-export module', () => {
    // this exact shape is what esbuild inlines into every commonjs-interop
    // module, and under Hermes it made each named export resolve to the last one
    expect(
      run(`
        var __defProp = Object.defineProperty
        var __getOwnPropNames = Object.getOwnPropertyNames
        var from = { a: 1, b: 2 }
        var to = {}
        for (let key of __getOwnPropNames(from)) {
          __defProp(to, key, { get: () => from[key], enumerable: true })
        }
        result = [to.a, to.b]
      `)
    ).toEqual([1, 2])
  })

  it('leaves loops that never capture their binding untouched', () => {
    expect(
      transformHermesLoops('for (let i = 0; i < 3; i++) sum += i', 'test.js')
    ).toBeNull()
  })

  it('gives a binding declared in the loop body a per-iteration copy', () => {
    // react-native's NativeAnimatedHelper builds one wrapper per method this
    // way; sharing `methodName` made every wrapper resolve the last method.
    expect(
      run(`
        var names = ['createAnimatedNode', 'addListener', 'removeListener']
        var wrappers = {}
        for (var ii = 0; ii < names.length; ii++) {
          const methodName = names[ii]
          wrappers[methodName] = () => methodName
        }
        result = names.map((n) => wrappers[n]())
      `)
    ).toEqual(['createAnimatedNode', 'addListener', 'removeListener'])
  })

  it('gives a binding declared in a nested block of the loop body a per-iteration copy', () => {
    expect(
      run(`
        var fns = []
        for (var i = 0; i < 3; i++) {
          if (i >= 0) {
            const doubled = i * 2
            fns.push(() => doubled)
          }
        }
        result = fns.map((f) => f())
      `)
    ).toEqual([0, 2, 4])
  })

  it('keeps `this` and `arguments` meaning what they meant outside the loop', () => {
    // reanimated's PropsFilter reads `this._map` from a closure inside a
    // `for (const key in props)` body, so a lifted body that rebound `this`
    // crashed every animated component.
    expect(
      run(`
        class PropsFilter {
          constructor() { this._map = { a: 'A', b: 'B' } }
          filter(props) {
            var out = []
            for (const key in props) {
              const label = key
              out.push(() => this._map[label] + arguments.length)
            }
            return out
          }
        }
        result = new PropsFilter().filter({ a: 1, b: 2 }).map((f) => f())
      `)
    ).toEqual(['A1', 'B1'])
  })

  it('leaves a loop with no lexical binding untouched', () => {
    expect(
      transformHermesLoops('for (var i = 0; i < 3; i++) fns.push(() => i)', 'test.js')
    ).toBeNull()
  })

  it('leaves the head declaration alone so it cannot collide with a sibling', () => {
    // react-native-gesture-handler's Pressable declares `const gesture` in the
    // same block as `for (const gesture of gestures)`. hoisting the head to
    // `var` made that a redeclaration and failed the whole bundle to parse.
    const out = transformHermesLoops(
      `function build(gestures) {
         var handlers = []
         for (const gesture of gestures) { handlers.push(() => gesture) }
         const gesture = gestures[0]
         return gesture
       }`,
      'Pressable.js'
    )
    // a redeclaration is a SyntaxError, so compiling is the whole assertion
    expect(() => new vm.Script(out!.code)).not.toThrow()
  })

  it('rewrites a loop in a .js file that still contains jsx', () => {
    // react-native and its dependencies ship jsx inside plain `.js`, and the
    // rolldown native pipeline keeps jsx unlowered until after this transform.
    const out = transformHermesLoops(
      'for (const c of items) rows.push(() => <Row key={c} />)',
      'Rows.js'
    )
    expect(out?.code).toContain('_hermesLoop0')
  })

  it('does not rewrite a loop that reassigns its own binding', () => {
    // the update would be stranded inside the lifted function
    expect(
      transformHermesLoops(
        'for (let i = 0; i < 3; i++) { i += 1; fns.push(() => i) }',
        'test.js'
      )
    ).toBeNull()
  })
})
