/**
 * Intent-based link prefetching using mouse trajectory prediction.
 *
 * Uses ray-casting to detect when the user is moving toward a link,
 * scoring by distance + perpendicular offset. Winner-takes-all prevents
 * over-fetching when multiple links are in the path.
 *
 * Key features:
 * - Batched IntersectionObserver for efficient rect measurement (300ms intervals)
 * - Velocity smoothing to filter jitter
 * - Prefetched links removed from future checks
 * - Debounce between consecutive prefetches
 */

export type PrefetchIntentOptions = {
  onPrefetch: (href: string) => void
  /** Max distance to consider (default: 600px) */
  maxReach?: number
  /** Penalty multiplier for off-axis aim (default: 4) */
  perpWeight?: number
  /** Min mouse speed to trigger (default: 6px/frame) */
  minSpeed?: number
}

type RectEntry = { r: DOMRectReadOnly; h: string }

export function createPrefetchIntent(options: PrefetchIntentOptions) {
  const { onPrefetch, maxReach = 500, perpWeight = 5, minSpeed = 8 } = options

  const done = new Set<string>()
  let rects: RectEntry[] = []
  let px = 0,
    py = 0,
    vx = 0,
    vy = 0
  let moveCount = 0
  let lastPrefetchMove = 0

  function setRects(newRects: RectEntry[]) {
    rects = newRects.filter((r) => !done.has(r.h))
  }

  function move(x: number, y: number, dx: number, dy: number) {
    moveCount++
    // less smoothing on first few moves to build velocity faster
    const smooth = moveCount < 3 ? 0.3 : 0.6
    vx = vx * smooth + dx * (1 - smooth)
    vy = vy * smooth + dy * (1 - smooth)
    px = x
    py = y

    const speed = Math.sqrt(vx * vx + vy * vy)
    if (speed < minSpeed) return

    // normalize velocity to unit vector
    const ux = vx / speed
    const uy = vy / speed

    let best = Infinity
    let href = ''

    for (const { r, h } of rects) {
      // vector from cursor to link center
      const cx = (r.left + r.right) / 2 - px
      const cy = (r.top + r.bottom) / 2 - py
      const dist = Math.sqrt(cx * cx + cy * cy)

      // project center onto velocity ray: how far along the ray?
      const along = cx * ux + cy * uy
      if (along < 0) continue // behind us

      // perpendicular distance from ray to center
      const perpX = cx - along * ux
      const perpY = cy - along * uy
      const perp = Math.sqrt(perpX * perpX + perpY * perpY)

      // miss if perpendicular distance > half the link size + margin
      // scale margin by distance - farther = need tighter aim
      const baseRadius = Math.max(r.width, r.height) / 2 + 30
      const distanceFactor = Math.max(0.2, 1 - dist / 1000)
      const radius = baseRadius * distanceFactor + 20
      if (perp > radius) continue

      // score: balance distance and aim quality
      // absolute perp matters more than relative - being 70px off at any distance is worse than 20px off
      // score = distance + perp * perpWeight (lower is better)
      const score = along + perp * perpWeight
      if (score < best) {
        best = score
        href = h
      }
    }

    // winner takes all with max reach
    // debounce: skip if we just prefetched on previous move
    if (href && best < maxReach && moveCount - lastPrefetchMove > 1) {
      done.add(href)
      rects = rects.filter((r) => r.h !== href)
      lastPrefetchMove = moveCount
      onPrefetch(href)
    }
  }

  // for integration with DOM
  const nodes = new Map<HTMLElement, string>()

  function observe(el: HTMLElement, href: string) {
    nodes.set(el, href)
    return () => {
      nodes.delete(el)
      done.delete(href)
    }
  }

  return { setRects, move, observe, nodes, done }
}

// singleton for actual DOM usage
let instance: ReturnType<typeof createPrefetchIntent> | null = null
let started = false

export function startPrefetchIntent(onPrefetch: (href: string) => void) {
  if (started) return instance!
  started = true

  instance = createPrefetchIntent({ onPrefetch })

  let frame = 0
  let px = 0,
    py = 0

  // batch measure all nodes using single IntersectionObserver
  function measure() {
    if (!instance!.nodes.size) return setTimeout(measure, 300)
    const io = new IntersectionObserver((entries) => {
      io.disconnect()
      instance!.setRects(
        entries
          .filter((e) => e.isIntersecting)
          .map((e) => ({
            r: e.boundingClientRect,
            h: instance!.nodes.get(e.target as HTMLElement)!,
          }))
          .filter((x) => x.h)
      )
      setTimeout(measure, 300)
    })
    instance!.nodes.forEach((_, el) => io.observe(el))
  }
  measure()

  document.addEventListener(
    'mousemove',
    (e) => {
      // throttle to every 4th frame (~66ms at 60fps)
      if (++frame % 4) return

      const dx = e.clientX - px
      const dy = e.clientY - py
      px = e.clientX
      py = e.clientY

      instance!.move(px, py, dx, dy)
    },
    { passive: true }
  )

  return instance
}

export function observePrefetchIntent(el: HTMLElement, href: string) {
  if (!instance) return () => {}
  return instance.observe(el, href)
}
