import { describe, expect, it } from 'vitest'
import {
  encodeReservedFilenameChars,
  getLoaderPath,
  getPathFromLoaderPath,
  getPreloadPath,
} from './cleanUrl'

/**
 * tests the cleanUrl encode/decode roundtrip used for loader URLs.
 *
 * cleanUrl encodes a URL path into a flat filename segment:
 *   - escapes underscores: _ → __
 *   - replaces slashes: / → _
 *
 * getPathFromLoaderPath reverses it:
 *   - __ → _ (escaped underscore)
 *   - _  → / (path separator)
 */

function roundtrip(path: string): string {
  const loaderPath = getLoaderPath(path, false)
  return getPathFromLoaderPath(loaderPath)
}

describe('cleanUrl roundtrip', () => {
  it('simple path', () => {
    expect(roundtrip('/docs/getting-started')).toBe('/docs/getting-started')
  })

  it('path with underscore prefix (/_/docs)', () => {
    expect(roundtrip('/_/docs/getting-started')).toBe('/_/docs/getting-started')
  })

  it('path with underscore prefix (/_/terms)', () => {
    expect(roundtrip('/_/terms')).toBe('/_/terms')
  })

  it('path with underscore in segment name', () => {
    expect(roundtrip('/my_page/test')).toBe('/my_page/test')
  })

  it('deeply nested path', () => {
    expect(roundtrip('/deep/nested/path/here')).toBe('/deep/nested/path/here')
  })

  it('root path', () => {
    expect(roundtrip('/')).toBe('/')
  })

  it('single segment', () => {
    expect(roundtrip('/about')).toBe('/about')
  })

  it('path with query string is stripped', () => {
    const loaderPath = getLoaderPath('/docs/intro?foo=bar', false)
    expect(getPathFromLoaderPath(loaderPath)).toBe('/docs/intro')
  })

  it('path with hash is stripped', () => {
    const loaderPath = getLoaderPath('/docs/intro#section', false)
    expect(getPathFromLoaderPath(loaderPath)).toBe('/docs/intro')
  })

  it('path with trailing slash', () => {
    const loaderPath = getLoaderPath('/docs/intro/', false)
    expect(getPathFromLoaderPath(loaderPath)).toBe('/docs/intro')
  })
})

describe('getLoaderPath format', () => {
  it('includes /assets/ prefix', () => {
    const result = getLoaderPath('/docs/intro', false)
    expect(result).toMatch(/^\/assets\//)
  })

  it('ends with loader postfix', () => {
    const result = getLoaderPath('/docs/intro', false)
    expect(result).toMatch(/_\d+_vxrn_loader\.js$/)
  })

  it('includes /_one prefix in dev mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    try {
      const result = getLoaderPath('/docs/intro', false)
      expect(result).toMatch(/^\/_one\/assets\//)
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  it('includes cache bust segment', () => {
    const result = getLoaderPath('/docs/intro', false, '12345')
    expect(result).toContain('_refetch_12345_')
  })
})

describe('NTFS-reserved characters in route-derived names', () => {
  // route patterns reach these functions verbatim when a dynamic route has no
  // generateStaticParams (every dynamic +ssr/+spa route at build time)
  it('roundtrips a root dynamic route pattern', () => {
    expect(roundtrip('/:param')).toBe('/:param')
  })

  it('roundtrips a nested dynamic route pattern', () => {
    expect(roundtrip('/dashboard/:appId')).toBe('/dashboard/:appId')
  })

  it('roundtrips a catch-all pattern', () => {
    expect(roundtrip('/*')).toBe('/*')
  })

  it('roundtrips hostile concrete param values (chars that survive URL parsing raw)', () => {
    // getLoaderPath URL-parses its input; WHATWG URL percent-encodes " < > |
    // in pathnames but passes : and * through raw — those two are the ones
    // that reach generated filenames verbatim (and are the NTFS killers)
    expect(roundtrip('/blog/a:b*c')).toBe('/blog/a:b*c')
  })

  it('emits filesystem-legal names for the full reserved set via preload paths', () => {
    // getPreloadPath does not URL-parse, so every reserved char reaches the
    // encoder raw — assert none survive into the filename
    expect(getPreloadPath('/blog/a:b*c"d<e>f|g?h')).not.toMatch(/[<>:"|?*]/)
  })

  it('roundtrips literal equals signs (self-escape)', () => {
    expect(roundtrip('/foo=bar')).toBe('/foo=bar')
  })

  it('roundtrips equals followed by hex-looking characters', () => {
    expect(roundtrip('/x=3ay')).toBe('/x=3ay')
  })

  it('emits no NTFS-reserved characters in loader filenames', () => {
    expect(getLoaderPath('/dashboard/:appId', false)).not.toMatch(/[<>:"|?*]/)
  })

  it('emits no NTFS-reserved characters in preload filenames', () => {
    expect(getPreloadPath('/:param')).not.toMatch(/[<>:"|?*]/)
    expect(getPreloadPath('/*')).not.toMatch(/[<>:"|?*]/)
  })

  it('encodeReservedFilenameChars is identity for clean paths', () => {
    expect(encodeReservedFilenameChars('/blog/my-slug.html')).toBe('/blog/my-slug.html')
  })

  it('encodes the html artifact path for non-prerendered dynamic routes', () => {
    expect(encodeReservedFilenameChars('/dashboard/:appId.html')).toBe(
      '/dashboard/=3aappId.html'
    )
    expect(encodeReservedFilenameChars('/*.html')).toBe('/=2a.html')
  })
})

describe('getPathFromLoaderPath', () => {
  it('strips /_one/assets prefix', () => {
    expect(getPathFromLoaderPath('/_one/assets/docs_intro_999_vxrn_loader.js')).toBe(
      '/docs/intro'
    )
  })

  it('strips /assets prefix', () => {
    expect(getPathFromLoaderPath('/assets/docs_intro_999_vxrn_loader.js')).toBe(
      '/docs/intro'
    )
  })

  it('strips refetch cache bust', () => {
    expect(
      getPathFromLoaderPath('/assets/docs_intro_refetch_12345__999_vxrn_loader.js')
    ).toBe('/docs/intro')
  })

  it('decodes escaped underscores back to literal underscores', () => {
    // path /_/docs/intro → cleanUrl("_/docs/intro") → "___docs_intro"
    // ___ decodes as: __ → "_", _ → "/" → "/_/docs/intro"
    expect(getPathFromLoaderPath('/assets/___docs_intro_999_vxrn_loader.js')).toBe(
      '/_/docs/intro'
    )
  })
})
