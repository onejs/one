import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { formatForMirror, mirrorPaths } from '../codegen/staticSpecs'

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
    ['dist\\cjs\\specs\\S.cjs', 'cjs'],
    ['dist\\esm\\specs\\S.mjs', 'esm'],
  ] as const)('formats %s as %s', (mirror, format) => {
    expect(formatForMirror(mirror)).toBe(format)
  })

})
