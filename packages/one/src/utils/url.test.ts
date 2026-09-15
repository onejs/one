import { describe, expect, it } from 'vitest'
import { hasFileExtension, shouldLinkExternally, shouldPreloadRoute } from './url'

describe('url utils', () => {
  describe('hasFileExtension', () => {
    it('returns true for common file extensions', () => {
      expect(hasFileExtension('/ui/button.md')).toBe(true)
      expect(hasFileExtension('/llms.txt')).toBe(true)
      expect(hasFileExtension('/favicon.ico')).toBe(true)
      expect(hasFileExtension('/assets/image.png')).toBe(true)
      expect(hasFileExtension('/doc.pdf')).toBe(true)
      expect(hasFileExtension('/data.json')).toBe(true)
      expect(hasFileExtension('/archive.zip')).toBe(true)
      expect(hasFileExtension('/styles.css')).toBe(true)
      expect(hasFileExtension('/script.js')).toBe(true)
      expect(hasFileExtension('/manifest.webmanifest')).toBe(true)
      expect(hasFileExtension('/font.woff2')).toBe(true)
    })

    it('returns true with query params or hashes', () => {
      expect(hasFileExtension('/ui/button.md?download=1')).toBe(true)
      expect(hasFileExtension('/llms.txt#section')).toBe(true)
      expect(hasFileExtension('https://tamagui.dev/ui/button.md?foo=bar#baz')).toBe(true)
    })

    it('returns false for route paths without extensions', () => {
      expect(hasFileExtension('/')).toBe(false)
      expect(hasFileExtension('/about')).toBe(false)
      expect(hasFileExtension('/ui/button')).toBe(false)
      expect(hasFileExtension('/docs/components/button')).toBe(false)
      expect(hasFileExtension('/v1.0')).toBe(false)
      expect(hasFileExtension('/version-2.1.0')).toBe(false)
      expect(hasFileExtension('/docs/1.0/intro')).toBe(false)
    })

    it('returns false for empty or invalid inputs', () => {
      expect(hasFileExtension('')).toBe(false)
    })
  })

  describe('shouldPreloadRoute', () => {
    it('returns true for valid internal routes', () => {
      expect(shouldPreloadRoute('/')).toBe(true)
      expect(shouldPreloadRoute('/about')).toBe(true)
      expect(shouldPreloadRoute('/ui/button')).toBe(true)
      expect(shouldPreloadRoute('/docs/components/button')).toBe(true)
    })

    it('returns false for file extensions', () => {
      expect(shouldPreloadRoute('/ui/button.md')).toBe(false)
      expect(shouldPreloadRoute('/llms.txt')).toBe(false)
      expect(shouldPreloadRoute('/favicon.ico')).toBe(false)
    })

    it('returns false for external urls or schemes', () => {
      expect(shouldPreloadRoute('https://example.com/about')).toBe(false)
      expect(shouldPreloadRoute('http://example.com')).toBe(false)
      expect(shouldPreloadRoute('mailto:test@example.com')).toBe(false)
      expect(shouldPreloadRoute('tel:123456')).toBe(false)
    })

    it('returns false for hash links or empty hrefs', () => {
      expect(shouldPreloadRoute('#section')).toBe(false)
      expect(shouldPreloadRoute('')).toBe(false)
    })
  })
})
