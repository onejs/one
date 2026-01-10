import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { One } from '../vite/types'
import { generateSitemap, type RouteSitemapData } from './generateSitemap'

describe('generateSitemap', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.ONE_SERVER_URL
    delete process.env.ONE_SERVER_URL
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ONE_SERVER_URL = originalEnv
    } else {
      delete process.env.ONE_SERVER_URL
    }
  })

  it('generates basic sitemap XML', () => {
    const routes: RouteSitemapData[] = [
      { path: '/' },
      { path: '/about' },
      { path: '/blog' },
    ]
    const options: One.SitemapOptions = {}

    const result = generateSitemap(routes, options)

    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(result).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    )
    expect(result).toContain('<loc>/</loc>')
    expect(result).toContain('<loc>/about</loc>')
    expect(result).toContain('<loc>/blog</loc>')
    expect(result).toContain('</urlset>')
  })

  it('uses baseUrl when provided', () => {
    const routes: RouteSitemapData[] = [{ path: '/' }, { path: '/about' }]
    const options: One.SitemapOptions = {
      baseUrl: 'https://example.com',
    }

    const result = generateSitemap(routes, options)

    expect(result).toContain('<loc>https://example.com/</loc>')
    expect(result).toContain('<loc>https://example.com/about</loc>')
  })

  it('strips trailing slash from baseUrl', () => {
    const routes: RouteSitemapData[] = [{ path: '/about' }]
    const options: One.SitemapOptions = {
      baseUrl: 'https://example.com/',
    }

    const result = generateSitemap(routes, options)

    expect(result).toContain('<loc>https://example.com/about</loc>')
    expect(result).not.toContain('https://example.com//about')
  })

  it('uses ONE_SERVER_URL env var when baseUrl not provided', () => {
    process.env.ONE_SERVER_URL = 'https://env-url.com'

    const routes: RouteSitemapData[] = [{ path: '/test' }]
    const options: One.SitemapOptions = {}

    const result = generateSitemap(routes, options)

    expect(result).toContain('<loc>https://env-url.com/test</loc>')
  })

  it('applies default priority to all routes', () => {
    const routes: RouteSitemapData[] = [{ path: '/' }, { path: '/about' }]
    const options: One.SitemapOptions = {
      priority: 0.8,
    }

    const result = generateSitemap(routes, options)

    expect(result).toMatch(
      /<url>\s*<loc>\/about<\/loc>\s*<priority>0\.8<\/priority>\s*<\/url>/s
    )
  })

  it('applies default changefreq to all routes', () => {
    const routes: RouteSitemapData[] = [{ path: '/' }, { path: '/about' }]
    const options: One.SitemapOptions = {
      changefreq: 'weekly',
    }

    const result = generateSitemap(routes, options)

    expect(result).toContain('<changefreq>weekly</changefreq>')
  })

  it('respects route-level sitemap exports', () => {
    const routes: RouteSitemapData[] = [
      { path: '/', routeExport: { priority: 1.0, changefreq: 'daily' } },
      { path: '/about', routeExport: { priority: 0.5, changefreq: 'monthly' } },
    ]
    const options: One.SitemapOptions = {
      priority: 0.7,
      changefreq: 'weekly',
    }

    const result = generateSitemap(routes, options)

    // Route exports should override defaults
    expect(result).toMatch(
      /<url>\s*<loc>\/<\/loc>\s*<changefreq>daily<\/changefreq>\s*<priority>1\.0<\/priority>\s*<\/url>/s
    )
    expect(result).toMatch(
      /<url>\s*<loc>\/about<\/loc>\s*<changefreq>monthly<\/changefreq>\s*<priority>0\.5<\/priority>\s*<\/url>/s
    )
  })

  it('excludes routes with routeExport.exclude = true', () => {
    const routes: RouteSitemapData[] = [
      { path: '/' },
      { path: '/admin', routeExport: { exclude: true } },
      { path: '/about' },
    ]
    const options: One.SitemapOptions = {}

    const result = generateSitemap(routes, options)

    expect(result).toContain('<loc>/</loc>')
    expect(result).toContain('<loc>/about</loc>')
    expect(result).not.toContain('/admin')
  })

  it('excludes routes matching exclude glob patterns', () => {
    const routes: RouteSitemapData[] = [
      { path: '/' },
      { path: '/admin/dashboard' },
      { path: '/admin/users' },
      { path: '/about' },
      { path: '/api/health' },
    ]
    const options: One.SitemapOptions = {
      exclude: ['/admin/*', '/api/*'],
    }

    const result = generateSitemap(routes, options)

    expect(result).toContain('<loc>/</loc>')
    expect(result).toContain('<loc>/about</loc>')
    expect(result).not.toContain('/admin')
    expect(result).not.toContain('/api')
  })

  it('includes lastmod when provided in route export', () => {
    const routes: RouteSitemapData[] = [
      { path: '/', routeExport: { lastmod: '2024-01-15' } },
      { path: '/about', routeExport: { lastmod: new Date('2024-06-20') } },
    ]
    const options: One.SitemapOptions = {}

    const result = generateSitemap(routes, options)

    expect(result).toContain('<lastmod>2024-01-15</lastmod>')
    expect(result).toContain('<lastmod>2024-06-20</lastmod>')
  })

  it('escapes XML special characters in URLs', () => {
    const routes: RouteSitemapData[] = [{ path: '/search?q=foo&bar=baz' }]
    const options: One.SitemapOptions = {
      baseUrl: 'https://example.com',
    }

    const result = generateSitemap(routes, options)

    expect(result).toContain('&amp;')
    expect(result).not.toContain('&bar')
  })

  it('generates empty sitemap when no routes', () => {
    const routes: RouteSitemapData[] = []
    const options: One.SitemapOptions = {}

    const result = generateSitemap(routes, options)

    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(result).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    )
    expect(result).toContain('</urlset>')
    expect(result).not.toContain('<url>')
  })

  it('handles all valid changefreq values', () => {
    const changefreqs: One.SitemapChangefreq[] = [
      'always',
      'hourly',
      'daily',
      'weekly',
      'monthly',
      'yearly',
      'never',
    ]

    for (const changefreq of changefreqs) {
      const routes: RouteSitemapData[] = [{ path: '/', routeExport: { changefreq } }]
      const result = generateSitemap(routes, {})
      expect(result).toContain(`<changefreq>${changefreq}</changefreq>`)
    }
  })

  it('formats priority with one decimal place', () => {
    const routes: RouteSitemapData[] = [
      { path: '/', routeExport: { priority: 1 } },
      { path: '/about', routeExport: { priority: 0.5 } },
      { path: '/blog', routeExport: { priority: 0.75 } },
    ]
    const options: One.SitemapOptions = {}

    const result = generateSitemap(routes, options)

    expect(result).toContain('<priority>1.0</priority>')
    expect(result).toContain('<priority>0.5</priority>')
    expect(result).toContain('<priority>0.8</priority>') // 0.75 rounds to 0.8
  })
})
