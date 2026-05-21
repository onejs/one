import { describe, expect, it } from 'vitest'

import { toServerOutputPath } from './toServerOutputPath'

describe('toServerOutputPath', () => {
  it('prepends ${outDir}/server/ to bare filenames from Vite output', () => {
    expect(toServerOutputPath('assets/loader-abc.js', 'dist')).toBe(
      'dist/server/assets/loader-abc.js'
    )
  })

  it('prepends ${outDir}/server/ to project-relative paths from the route tree', () => {
    expect(toServerOutputPath('./pages/index.tsx', 'dist')).toBe(
      'dist/server/pages/index.tsx'
    )
  })

  it('returns input unchanged when it is already rooted under ${outDir}/server/', () => {
    expect(toServerOutputPath('dist/server/assets/loader-abc.js', 'dist')).toBe(
      'dist/server/assets/loader-abc.js'
    )
  })

  it('treats backslashes as separators on every platform (the Windows path-doubling case)', () => {
    // already-prefixed backslash input — must normalize before sentinel check
    expect(toServerOutputPath('dist\\server\\assets\\loader-abc.js', 'dist')).toBe(
      'dist/server/assets/loader-abc.js'
    )
  })

  it('is idempotent: feeding the output back in returns the same value', () => {
    const first = toServerOutputPath('assets/loader-abc.js', 'dist')
    const second = toServerOutputPath(first, 'dist')
    expect(second).toBe(first)
  })

  it('honors a custom outDir', () => {
    expect(toServerOutputPath('assets/loader.js', 'build')).toBe(
      'build/server/assets/loader.js'
    )
  })

  it('does not false-positive on inputs that contain ${outDir}/server as a substring but are not rooted under it', () => {
    // startsWith required: .includes would match foo/dist/server/x and wrongly skip
    expect(toServerOutputPath('foo/dist/server/bar.js', 'dist')).toBe(
      'dist/server/foo/dist/server/bar.js'
    )
  })
})
