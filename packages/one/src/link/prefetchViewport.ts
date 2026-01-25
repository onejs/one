/**
 * Viewport-based link prefetching using IntersectionObserver.
 *
 * Prefetches links when they enter the viewport with 100px margin.
 * Lighter weight than intent-based, good for content-heavy pages.
 */

export type ViewportPrefetcher = ReturnType<typeof createPrefetchViewport>

export function createPrefetchViewport() {
  const done = new Set<string>()
  const nodes = new Map<HTMLElement, string>()
  let io: IntersectionObserver | null = null
  let onPrefetch: ((href: string) => void) | null = null

  function getObserver() {
    if (io) return io
    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const href = nodes.get(entry.target as HTMLElement)
          if (href && !done.has(href)) {
            done.add(href)
            onPrefetch?.(href)
          }
        }
      },
      { threshold: 0.5 } // fires when mostly visible
    )
    return io
  }

  function start(prefetch: (href: string) => void) {
    onPrefetch = prefetch
  }

  function observe(el: HTMLElement, href: string) {
    nodes.set(el, href)
    getObserver().observe(el)
    return () => {
      nodes.delete(el)
      io?.unobserve(el)
      done.delete(href)
    }
  }

  return { start, observe, done, nodes }
}

// singleton for actual DOM usage
let instance: ViewportPrefetcher | null = null

export function startPrefetchViewport(prefetch: (href: string) => void) {
  if (!instance) instance = createPrefetchViewport()
  instance.start(prefetch)
}

export function observePrefetchViewport(el: HTMLElement, href: string) {
  if (!instance) instance = createPrefetchViewport()
  return instance.observe(el, href)
}
