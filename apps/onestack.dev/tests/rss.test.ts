import { expect, test } from 'vitest'
import { createRssFeed } from '../app/(content)/blog/rss.xml+api'

const serverUrl = process.env.ONE_SERVER_URL || 'http://localhost:8081'

test('serves published blog posts as RSS 2.0', async () => {
  const response = await fetch(`${serverUrl}/blog/rss.xml`)

  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8')

  const xml = await response.text()

  expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
  expect(xml).toContain('<rss version="2.0">')
  expect(xml).toContain('<title>One Blog</title>')
  expect(xml).toContain('<link>https://onestack.dev/blog</link>')
  expect(xml).toContain('<description>Latest news and updates from One</description>')
  expect(xml).toContain('<title>One v1 Release Candidate</title>')
  expect(xml).toContain('<link>https://onestack.dev/blog/version-one</link>')
  expect(xml).toContain('<guid>https://onestack.dev/blog/version-one</guid>')
  expect(xml).toContain('<pubDate>Sun, 28 Dec 2025 00:00:00 GMT</pubDate>')
  expect(xml).toContain(
    '<description>The React framework for cross-platform apps (with a single Vite plugin).</description>'
  )
})

test('excludes draft blog posts', () => {
  const xml = createRssFeed([
    {
      title: 'Published post',
      slug: 'published-post',
      publishedAt: '2026-01-02',
      description: 'Visible to readers',
    },
    {
      title: 'Draft post',
      slug: 'draft-post',
      publishedAt: '2026-01-03',
      description: 'Not ready for readers',
      draft: true,
    },
  ])

  expect(xml).toContain('<title>Published post</title>')
  expect(xml).not.toContain('Draft post')
  expect(xml).not.toContain('https://onestack.dev/blog/draft-post')
})

test('sorts published blog posts newest first', () => {
  const xml = createRssFeed([
    {
      title: 'Older post',
      slug: 'older-post',
      publishedAt: '2026-01-02',
      description: 'Published first',
    },
    {
      title: 'Newer post',
      slug: 'newer-post',
      publishedAt: '2026-02-03',
      description: 'Published later',
    },
  ])

  expect(xml.indexOf('<title>Newer post</title>')).toBeLessThan(
    xml.indexOf('<title>Older post</title>')
  )
})

test('escapes XML text in blog feed items', () => {
  const xml = createRssFeed([
    {
      title: `Rock & <Roll> "Now" 'Live'`,
      slug: 'rock&roll',
      publishedAt: '2026-03-04',
      description: `Use & <angles> "quotes" and 'apostrophes'`,
    },
  ])

  expect(xml).toContain(
    '<title>Rock &amp; &lt;Roll&gt; &quot;Now&quot; &apos;Live&apos;</title>'
  )
  expect(xml).toContain('<link>https://onestack.dev/blog/rock&amp;roll</link>')
  expect(xml).toContain('<guid>https://onestack.dev/blog/rock&amp;roll</guid>')
  expect(xml).toContain(
    '<description>Use &amp; &lt;angles&gt; &quot;quotes&quot; and &apos;apostrophes&apos;</description>'
  )
})

test('advertises the RSS feed in the site head', async () => {
  const response = await fetch(serverUrl)
  const html = await response.text()

  expect(html).toMatch(
    /<link(?=[^>]*rel="alternate")(?=[^>]*type="application\/rss\+xml")(?=[^>]*href="\/blog\/rss\.xml")[^>]*>/
  )
})
