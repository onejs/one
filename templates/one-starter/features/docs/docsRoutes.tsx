// explicit docs menu — sequencing controls the prev/next pagination too.
export type DocsRoute = { slug: string; title: string }

export const docsRoutes: DocsRoute[] = [
  { slug: 'intro', title: 'Introduction' },
  { slug: 'getting-started', title: 'Getting started' },
]

export function findDocAdjacent(slug: string): {
  previous: DocsRoute | null
  next: DocsRoute | null
} {
  const i = docsRoutes.findIndex((r) => r.slug === slug)
  if (i === -1) return { previous: null, next: null }
  return {
    previous: i > 0 ? docsRoutes[i - 1] : null,
    next: i < docsRoutes.length - 1 ? docsRoutes[i + 1] : null,
  }
}
