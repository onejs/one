import { describe, expect, it } from 'vitest'
import { normalizeReSource } from './getViteMetroPluginOptions'

// String.raw avoids double-escaping: String.raw`[\\/]` is the 5-char string [ \ \ / ]
// which is exactly what regex.source produces for /[\\/]/

describe('normalizeReSource', () => {
  it(String.raw`[\\/] to \/`, () => {
    expect(normalizeReSource(String.raw`[\\/]`)).toBe(String.raw`\/`)
  })

  it(String.raw`[^\\/] to [^/]`, () => {
    expect(normalizeReSource(String.raw`[^\\/]`)).toBe('[^/]')
  })

  it('full Windows micromatch regex', () => {
    // micromatch.makeRe('**/*.web.(ts|tsx)').source on Windows (picomatch 2.x)
    const windowsSource = String.raw`^(?:(?:^|[\\/]|(?:(?:(?!(?:^|[\\/])\.).)*?)[\\/])(?!\.)(?=.)[^\\/]*?\.web\.(ts|tsx))$`
    const posixSource = String.raw`^(?:(?:^|\/|(?:(?:(?!(?:^|\/)\.).)*?)\/)(?!\.)(?=.)[^/]*?\.web\.(ts|tsx))$`

    expect(normalizeReSource(windowsSource)).toBe(posixSource)
  })

  it('no-op for POSIX regex', () => {
    const posixSource = String.raw`^(?:(?:^|\/|(?:(?:(?!(?:^|\/)\.).)*?)\/)(?!\.)(?=.)[^/]*?\.web\.(ts|tsx))$`

    expect(normalizeReSource(posixSource)).toBe(posixSource)
  })

  it('multiple groups in one source', () => {
    const source = String.raw`a[\\/]b[\\/]c[^\\/]d`
    expect(normalizeReSource(source)).toBe(String.raw`a\/b\/c[^/]d`)
  })
})
