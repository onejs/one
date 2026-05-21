// lock in cross-platform output of node primitives — a regression here is a future Windows break.
import { posix } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { normalizePath } from 'vite'
import { toServerOutputPath } from './toServerOutputPath'

describe('path.posix.join — forward-slash output on every platform', () => {
  it('joins server-output paths', () => {
    expect(posix.join('dist', 'server', 'foo.js')).toBe('dist/server/foo.js')
  })

  it('joins middleware-output paths', () => {
    expect(posix.join('dist', 'middlewares', 'mw-hash.js')).toBe(
      'dist/middlewares/mw-hash.js'
    )
  })

  it('strips redundant `./` segments', () => {
    expect(posix.join('./app', './_layout.tsx')).toBe('app/_layout.tsx')
  })

  it('produces a bare filename for a `.` directory component', () => {
    expect(posix.join('.', 'foo-[hash].cjs')).toBe('foo-[hash].cjs')
  })

  it('preserves nested-chunk subdirectories', () => {
    expect(posix.join('subdir', 'foo-[hash].cjs')).toBe('subdir/foo-[hash].cjs')
  })
})

describe('pathToFileURL — canonical file:// URL specifier', () => {
  it('produces a forward-slash href on every platform', () => {
    const href = pathToFileURL('/proj/src/setup.ts').href
    expect(href.startsWith('file://')).toBe(true)
    expect(href.includes('\\')).toBe(false)
  })

  it('round-trips through JSON.stringify without backslashes leaking in', () => {
    // motivating defect: bare absolute path puts backslashes in emitted JS on Windows
    const href = pathToFileURL('/proj/src/setup.ts').href
    const stringified = JSON.stringify(href)
    expect(stringified.includes('\\\\')).toBe(false)
  })
})

describe('Vite normalizePath — converts on Windows, no-op on POSIX', () => {
  it('preserves a forward-slash path unchanged', () => {
    expect(normalizePath('/proj/src/foo.tsx')).toBe('/proj/src/foo.tsx')
  })

  it('converts backslashes (Windows-shaped input)', () => {
    // windows converts; POSIX passthrough (backslash is a valid filename char there)
    const input = String.raw`C:\proj\src\foo.tsx`
    const out = normalizePath(input)
    if (process.platform === 'win32') {
      expect(out).toBe('C:/proj/src/foo.tsx')
    } else {
      expect(out).toBe(input)
    }
  })
})

describe('toServerOutputPath — cross-platform parity', () => {
  // posix.join + backslash-replace (not normalizePath) — output must be byte-identical across platforms
  const cases: Array<[string, string, string]> = [
    ['foo.js', 'dist', 'dist/server/foo.js'],
    ['subdir/bar.js', 'dist', 'dist/server/subdir/bar.js'],
    ['dist/server/foo.js', 'dist', 'dist/server/foo.js'],
    [String.raw`dist\server\foo.js`, 'dist', 'dist/server/foo.js'],
    [String.raw`subdir\bar.js`, 'dist', 'dist/server/subdir/bar.js'],
    ['foo/dist/server/bar.js', 'dist', 'dist/server/foo/dist/server/bar.js'],
    ['dist/server', 'dist', 'dist/server'],
    ['baz.js', 'build', 'build/server/baz.js'],
  ]

  for (const [input, outDir, expected] of cases) {
    it(`("${input}", "${outDir}") → "${expected}"`, () => {
      expect(toServerOutputPath(input, outDir)).toBe(expected)
    })
  }
})

describe('seed bug regression — SSR loader path doubling on Windows', () => {
  // serverJsPath minted native sep; oneServe `.includes('/server')` missed; prefix doubled, await import() crashed
  it('does not double-prefix backslash-shaped server-output input', () => {
    const windowsShapedInput = String.raw`dist\server\assets\time_ssr-COqAsxju.js`
    expect(toServerOutputPath(windowsShapedInput, 'dist')).toBe(
      'dist/server/assets/time_ssr-COqAsxju.js'
    )
  })

  it('does not double-prefix already-forward-slashed input', () => {
    const posixInput = 'dist/server/assets/time_ssr-COqAsxju.js'
    expect(toServerOutputPath(posixInput, 'dist')).toBe(posixInput)
  })
})
