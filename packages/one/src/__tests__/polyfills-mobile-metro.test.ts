import { transformSync } from '@babel/core'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { parseSync } from 'oxc-parser'
import * as vm from 'node:vm'
import { expect, it } from 'vitest'

const nodeRequire = createRequire(import.meta.url)
const metroRequire = createRequire(nodeRequire.resolve('metro/package.json'))
const inlineRequiresPlugin = metroRequire('metro-transform-plugins').inlineRequiresPlugin
const polyfillFile = new URL('../../dist/esm/polyfills-mobile.native.js', import.meta.url)

function nativeCoreJsImports() {
  const code = readFileSync(polyfillFile, 'utf8')
  const parsed = parseSync(polyfillFile.pathname, code, { lang: 'js' })
  if (parsed.errors.length) throw new Error(parsed.errors[0].message)
  return parsed.program.body
    .filter((statement) => statement.type === 'ImportDeclaration')
    .map((statement) => statement.source.value)
    .filter((specifier) => specifier.startsWith('core-js/'))
}

function evaluateCoreJs(imports: string[]) {
  const context = vm.createContext({})
  vm.runInContext(
    'for (const name of ["toSorted", "toReversed", "toSpliced", "with"]) delete Array.prototype[name]',
    context
  )
  const cache = new Map<string, { exports: any }>()

  function load(specifier: string, from: string): any {
    const filename = createRequire(from).resolve(specifier)
    const cached = cache.get(filename)
    if (cached) return cached.exports

    const module = { exports: {} as any }
    cache.set(filename, module)
    const source = readFileSync(filename, 'utf8')
    const code = transformSync(source, {
      filename,
      babelrc: false,
      configFile: false,
      plugins: [inlineRequiresPlugin],
    })?.code
    if (!code) throw new Error(`Metro did not transform ${filename}`)

    const factory = vm.runInContext(
      `(function(require, module, exports) { ${code}\n })`,
      context,
      { filename }
    )
    factory((name: string) => load(name, filename), module, module.exports)
    return module.exports
  }

  for (const specifier of imports) load(specifier, polyfillFile.pathname)
  return (expression = 'Function.prototype.toString.call(function metroProbe() {})') =>
    vm.runInContext(expression, context)
}

it('installs change-array-by-copy methods before native consumers under Metro inline requires', () => {
  const evaluate = evaluateCoreJs(nativeCoreJsImports())

  expect(evaluate('JSON.stringify([2, 1].toSorted())')).toBe('[1,2]')
  expect(evaluate('JSON.stringify([1, 2].toReversed())')).toBe('[2,1]')
  expect(evaluate('JSON.stringify([1, 2, 3].toSpliced(1, 1, 4))')).toBe('[1,4,3]')
  expect(evaluate('JSON.stringify([1, 2].with(-1, 3))')).toBe('[1,3]')
  expect(
    evaluate('JSON.stringify(Array.prototype.toSorted.call({0: 2, 1: 1, length: 2}))')
  ).toBe('[1,2]')
  expect(evaluate('JSON.stringify([3, 2, 1].toSorted((a, b) => a - b))')).toBe('[1,2,3]')
  expect(evaluate('JSON.stringify([, 2].toSorted())')).toBe('[2,null]')
  expect(evaluate('0 in [, 2].toReversed() && 1 in [, 2].toReversed()')).toBe(true)
  expect(
    evaluate(
      '(() => { const a = [2, 1]; a.toSorted(); a.toReversed(); a.toSpliced(0, 1); a.with(0, 3); return JSON.stringify(a) })()'
    )
  ).toBe('[2,1]')
  expect(() => evaluate('[1, 2].with(2, 3)')).toThrow()
  expect(
    evaluate('Object.getOwnPropertyDescriptor(Array.prototype, "toSorted").enumerable')
  ).toBe(false)
})

it('keeps native core-js polyfills safe under Metro inline requires', () => {
  const imports = nativeCoreJsImports()

  // the control must still fail, or this probe no longer models Metro's bug.
  expect(() =>
    evaluateCoreJs(
      imports.filter((name) => name !== 'core-js/internals/inspect-source')
    )()
  ).toThrow()
  expect(evaluateCoreJs(imports)()).toContain('metroProbe')
})
