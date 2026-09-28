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

function evaluateCoreJs(imports: string[]) {
  const context = vm.createContext({})
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
  return () =>
    vm.runInContext('Function.prototype.toString.call(function metroProbe() {})', context)
}

it('keeps native core-js polyfills safe under Metro inline requires', () => {
  const code = readFileSync(polyfillFile, 'utf8')
  const parsed = parseSync(polyfillFile.pathname, code, { lang: 'js' })
  if (parsed.errors.length) throw new Error(parsed.errors[0].message)

  const imports = parsed.program.body
    .filter((statement) => statement.type === 'ImportDeclaration')
    .map((statement) => statement.source.value)
    .filter((specifier) => specifier.startsWith('core-js/'))

  // the control must still fail, or this probe no longer models Metro's bug.
  expect(() =>
    evaluateCoreJs(
      imports.filter((name) => name !== 'core-js/internals/inspect-source')
    )()
  ).toThrow()
  expect(evaluateCoreJs(imports)()).toContain('metroProbe')
})
