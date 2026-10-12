import matter from 'gray-matter'

const SITE_URL = 'https://onestack.dev'

export type BlogFrontmatter = {
  description?: string
  draft?: boolean
  publishedAt?: string
  slug: string
  title?: string
}

// bundled at build time so the route reads no filesystem at runtime (workers have none)
const blogSources = import.meta.glob<string>('../../../data/blog/**/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const blogFrontmatters: BlogFrontmatter[] = Object.entries(blogSources).map(
  ([path, source]) => ({
    ...matter(source).data,
    slug: path.replace(/^.*\/data\/blog\//, '').replace(/\.mdx$/, ''),
  })
)

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function createRssFeed(posts: BlogFrontmatter[]) {
  const items = posts
    .filter((post) => !post.draft)
    .sort(
      (a, b) =>
        Number(new Date(b.publishedAt || '')) - Number(new Date(a.publishedAt || ''))
    )
    .map((post) => {
      const permalink = `${SITE_URL}/blog/${post.slug.replace(/^blog\//, '')}`

      return `    <item>
      <title>${escapeXml(post.title || '')}</title>
      <link>${escapeXml(permalink)}</link>
      <guid>${escapeXml(permalink)}</guid>
      <pubDate>${escapeXml(new Date(post.publishedAt || '').toUTCString())}</pubDate>
      <description>${escapeXml(post.description || '')}</description>
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>One Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Latest news and updates from One</description>
${items}
  </channel>
</rss>`
}

export function GET() {
  return new Response(createRssFeed(blogFrontmatters), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}
