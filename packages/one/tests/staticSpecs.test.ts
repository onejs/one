import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { transformSync as transformBabel } from '@babel/core'
import { transformSync as transformJavaScript } from 'esbuild'
import { formatForMirror, mirrorPaths, rewriteDistSpecs } from '../codegen/staticSpecs'

describe('staticSpecs', () => {
  it('runs static commands through Metro codegen and dispatches their payloads', () => {
    const root = mkdtempSync(join(tmpdir(), 'static-pager-'))
    const specs = join(root, 'specs')
    const dist = join(root, 'dist')
    const name = 'OneNativePagerNativeComponent'
    const mirror = join(dist, 'esm', 'platform', 'specs', `${name}.native.js`)
    mkdirSync(specs, { recursive: true })
    mkdirSync(join(dist, 'esm', 'platform', 'specs'), { recursive: true })
    writeFileSync(
      join(specs, `${name}.ts`),
      readFileSync(new URL(`../src/platform/specs/${name}.ts`, import.meta.url), 'utf8')
    )
    writeFileSync(mirror, '')
    rewriteDistSpecs(specs, dist)
    const require = createRequire(import.meta.url)
    const consumed = transformBabel(readFileSync(mirror, 'utf8'), {
      filename: mirror,
      plugins: [require('@react-native/babel-plugin-codegen')],
      babelrc: false,
      configFile: false,
    })!.code!
    const calls: unknown[] = []
    const module = { exports: {} as any }
    const requireNative = (id: string) => {
      if (id.endsWith('/NativeComponentRegistry')) return { get: () => 'Pager' }
      if (id.endsWith('/ViewConfigIgnore'))
        return { ConditionallyIgnoredEventHandlers: (v: unknown) => v }
      if (id.endsWith('/RendererProxy'))
        return { dispatchCommand: (...args: unknown[]) => calls.push(args) }
      throw new Error(`unexpected runtime import ${id}`)
    }
    new Function(
      'require',
      'module',
      'exports',
      transformJavaScript(consumed, { format: 'cjs' }).code
    )(requireNative, module, module.exports)
    const view = {}
    module.exports.Commands.setPage(view, 2)
    module.exports.Commands.setPageWithoutAnimation(view, 1)
    module.exports.Commands.setScrollEnabledImperatively(view, false)
    expect(calls).toEqual([
      [view, 'setPage', [2]],
      [view, 'setPageWithoutAnimation', [1]],
      [view, 'setScrollEnabledImperatively', [false]],
    ])
  })
  it('maps a spec stem to its existing dist mirrors', () => {
    const dist = mkdtempSync(join(tmpdir(), 'static-specs-'))
    mkdirSync(join(dist, 'esm', 'platform', 'specs'), { recursive: true })
    mkdirSync(join(dist, 'cjs', 'platform', 'specs'), { recursive: true })
    const present = [
      'esm/platform/specs/S.mjs',
      'esm/platform/specs/S.native.js',
      'cjs/platform/specs/S.cjs',
    ]
    for (const relative of present) writeFileSync(join(dist, relative), '// mirror')
    expect(
      mirrorPaths(dist, 'S')
        .map((path) => path.slice(dist.length + 1))
        .sort()
    ).toEqual([...present].sort())
    expect(mirrorPaths(dist, 'Missing')).toEqual([])
  })

  it.each([
    ['dist/esm/specs/S.mjs', 'esm'],
    ['dist/esm/specs/S.native.js', 'esm'],
    ['dist/cjs/specs/S.cjs', 'cjs'],
    ['dist/cjs/specs/S.native.cjs', 'cjs'],
    ['dist/cjs/specs/S.native.js', 'cjs'],
    ['dist\\cjs\\specs\\S.cjs', 'cjs'],
    ['dist\\esm\\specs\\S.mjs', 'esm'],
  ] as const)('formats %s as %s', (mirror, format) => {
    expect(formatForMirror(mirror)).toBe(format)
  })
})
