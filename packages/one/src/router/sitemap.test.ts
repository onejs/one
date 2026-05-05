import { describe, expect, it } from 'vitest'
import { getRoutes } from './getRoutes'
import { getSitemap } from './sitemap'
import { getMockContext } from '../testing-utils'

describe('getSitemap', () => {
  it('maps the route tree to a public sitemap shape', () => {
    const routes = getRoutes(
      getMockContext([
        '_layout.tsx',
        'index.tsx',
        '(app)/_layout.tsx',
        '(app)/thread/[id].tsx',
        'docs/[...slug].tsx',
      ])
    )!
    const sitemap = getSitemap(routes)!

    expect(sitemap).toMatchObject({
      contextKey: './_layout.tsx',
      href: '/',
      isInternal: false,
      isGenerated: false,
      children: expect.arrayContaining([
        expect.objectContaining({
          contextKey: './index.tsx',
          filename: 'index',
          href: '/',
        }),
        expect.objectContaining({
          contextKey: './(app)/_layout.tsx',
          filename: '(app)/_layout',
          href: '/(app)',
          children: expect.arrayContaining([
            expect.objectContaining({
              contextKey: './(app)/thread/[id].tsx',
              filename: 'thread/[id]',
              href: '/(app)/thread/[id]',
            }),
          ]),
        }),
        expect.objectContaining({
          contextKey: './docs/[...slug].tsx',
          filename: 'docs/[...slug]',
          href: '/docs/[...slug]',
        }),
      ]),
    })
  })
})
