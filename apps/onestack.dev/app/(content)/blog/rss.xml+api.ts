const SITE_URL = 'https://onestack.dev'

export type BlogFrontmatter = {
  description?: string
  draft?: boolean
  publishedAt?: string
  slug: string
  title?: string
}

const blogFrontmattersPromise = import('@vxrn/mdx-rust').then(({ getAllFrontmatter }) =>
  getAllFrontmatter('data/blog')
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

export async function GET() {
  const frontmatters = await blogFrontmattersPromise

  return new Response(createRssFeed(frontmatters), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}
