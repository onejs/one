import MicroMatch from 'micromatch'
import type { One } from '../vite/types'

export type SitemapEntry = {
  path: string
  priority?: number
  changefreq?: One.SitemapChangefreq
  lastmod?: string | Date
}

export type RouteSitemapData = {
  path: string
  routeExport?: One.RouteSitemapExport
}

export function generateSitemap(routes: RouteSitemapData[], options: One.SitemapOptions): string {
  const envUrl = process.env.ONE_SERVER_URL
  const baseUrl = options.baseUrl ?? (envUrl && envUrl !== 'undefined' ? envUrl : '')
  const defaultPriority = options.priority ?? 0.5
  const defaultChangefreq = options.changefreq
  const excludePatterns = options.exclude || []

  const entries: SitemapEntry[] = []

  for (const route of routes) {
    const { path, routeExport } = route

    // Skip if route exports exclude: true
    if (routeExport?.exclude) {
      continue
    }

    // Skip if path matches any exclude pattern
    if (excludePatterns.length > 0 && MicroMatch.isMatch(path, excludePatterns)) {
      continue
    }

    const priority = routeExport?.priority ?? defaultPriority
    const changefreq = routeExport?.changefreq ?? defaultChangefreq
    const lastmod = routeExport?.lastmod

    entries.push({
      path,
      priority,
      changefreq,
      lastmod,
    })
  }

  return buildSitemapXml(entries, baseUrl)
}

function buildSitemapXml(entries: SitemapEntry[], baseUrl: string): string {
  const urlEntries = entries
    .map((entry) => {
      const loc = baseUrl ? `${baseUrl.replace(/\/$/, '')}${entry.path}` : entry.path

      let xml = `  <url>\n    <loc>${escapeXml(loc)}</loc>`

      if (entry.lastmod) {
        const date =
          entry.lastmod instanceof Date ? entry.lastmod.toISOString().split('T')[0] : entry.lastmod
        xml += `\n    <lastmod>${escapeXml(date)}</lastmod>`
      }

      if (entry.changefreq) {
        xml += `\n    <changefreq>${entry.changefreq}</changefreq>`
      }

      if (entry.priority !== undefined) {
        xml += `\n    <priority>${entry.priority.toFixed(1)}</priority>`
      }

      xml += '\n  </url>'
      return xml
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
