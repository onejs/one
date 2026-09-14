import { describe, expect, it } from 'vitest'
import { getPrefetchableHref } from './PreloadLinks'

function createMockAnchor(attrs: {
  href?: string
  target?: string
  download?: boolean
  rel?: string
}): HTMLAnchorElement {
  const el = {
    getAttribute(name: string) {
      if (name === 'href') return attrs.href ?? null
      if (name === 'rel') return attrs.rel ?? null
      return null
    },
    hasAttribute(name: string) {
      if (name === 'download') return !!attrs.download
      return false
    },
    target: attrs.target ?? '',
  } as unknown as HTMLAnchorElement
  return el
}

describe('getPrefetchableHref', () => {
  const baseUrl = 'https://tamagui.dev'

  it('returns clean href for valid internal routes', () => {
    const anchor = createMockAnchor({ href: '/ui/button' })
    expect(getPrefetchableHref(anchor, baseUrl)).toBe('/ui/button')
  })

  it('returns clean href for absolute urls matching baseUrl', () => {
    const anchor = createMockAnchor({ href: 'https://tamagui.dev/docs/intro' })
    expect(getPrefetchableHref(anchor, baseUrl)).toBe('/docs/intro')
  })

  it('returns null for target="_blank"', () => {
    const anchor = createMockAnchor({ href: '/docs/intro', target: '_blank' })
    expect(getPrefetchableHref(anchor, baseUrl)).toBeNull()
  })

  it('returns null for download attribute', () => {
    const anchor = createMockAnchor({ href: '/archive.zip', download: true })
    expect(getPrefetchableHref(anchor, baseUrl)).toBeNull()
  })

  it('returns null for rel="external"', () => {
    const anchor = createMockAnchor({ href: '/docs', rel: 'external' })
    expect(getPrefetchableHref(anchor, baseUrl)).toBeNull()
  })

  it('returns null for file extensions (.md, .txt, .png, etc.)', () => {
    expect(
      getPrefetchableHref(createMockAnchor({ href: '/ui/button.md' }), baseUrl)
    ).toBeNull()
    expect(
      getPrefetchableHref(createMockAnchor({ href: '/llms.txt' }), baseUrl)
    ).toBeNull()
    expect(
      getPrefetchableHref(
        createMockAnchor({ href: 'https://tamagui.dev/ui/button.md' }),
        baseUrl
      )
    ).toBeNull()
    expect(
      getPrefetchableHref(
        createMockAnchor({ href: 'https://tamagui.dev/llms.txt' }),
        baseUrl
      )
    ).toBeNull()
  })

  it('returns null for external urls', () => {
    const anchor = createMockAnchor({ href: 'https://google.com/about' })
    expect(getPrefetchableHref(anchor, baseUrl)).toBeNull()
  })
})
