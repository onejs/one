import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformSync } from 'esbuild'
import { emitViewConfig } from '../codegen/emitViewConfig'
import { formatForMirror, mirrorPaths } from '../codegen/staticSpecs'

const specsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'specs')

describe('staticSpecs', () => {
  it('maps a spec stem to its existing dist mirrors', () => {
    const dist = mkdtempSync(join(tmpdir(), 'static-specs-'))
    mkdirSync(join(dist, 'esm', 'specs'), { recursive: true })
    mkdirSync(join(dist, 'cjs', 'specs'), { recursive: true })
    const present = ['esm/specs/S.mjs', 'esm/specs/S.native.js', 'cjs/specs/S.cjs']
    for (const relative of present) writeFileSync(join(dist, relative), '// mirror')
    expect(mirrorPaths(dist, 'S').map((path) => path.slice(dist.length + 1)).sort()).toEqual(
      [...present].sort()
    )
    expect(mirrorPaths(dist, 'Missing')).toEqual([])
  })

  it.each([
    ['dist/esm/specs/S.mjs', 'esm'],
    ['dist/esm/specs/S.native.js', 'esm'],
    ['dist/cjs/specs/S.cjs', 'cjs'],
    ['dist/cjs/specs/S.native.cjs', 'cjs'],
    ['dist/cjs/specs/S.native.js', 'cjs'],
  ] as const)('formats %s as %s', (mirror, format) => {
    expect(formatForMirror(mirror)).toBe(format)
  })

  it.each(['esm', 'cjs'] as const)('stripped %s keeps the view config and no codegen call', (format) => {
    const filename = join(specsDir, 'OneNativeMenuNativeComponent.ts')
    const pluginBytes = emitViewConfig(readFileSync(filename, 'utf8'), filename)
    const { code } = transformSync(pluginBytes, { loader: 'ts', format })
    expect(code).toContain('__INTERNAL_VIEW_CONFIG')
    expect(code).not.toMatch(/codegenNativeComponent\s*[<(]/)
    expect(code).not.toContain('interface NativeProps')
  })
})
