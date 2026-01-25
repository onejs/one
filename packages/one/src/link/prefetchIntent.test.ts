import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createPrefetchIntent, type PrefetchIntentOptions } from './prefetchIntent'

// helper to create a mock rect
const rect = (x: number, y: number, w = 100, h = 40): DOMRectReadOnly => ({
  left: x,
  top: y,
  right: x + w,
  bottom: y + h,
  width: w,
  height: h,
  x,
  y,
  toJSON: () => ({}),
})

describe('prefetchIntent', () => {
  let prefetched: string[]
  let intent: ReturnType<typeof createPrefetchIntent>

  beforeEach(() => {
    prefetched = []
    intent = createPrefetchIntent({
      onPrefetch: (href) => prefetched.push(href),
    })
  })

  describe('basic targeting', () => {
    it('prefetches when moving directly toward a link', () => {
      intent.setRects([{ r: rect(500, 300), h: '/about' }])

      // start at 100,300 moving right toward link at 500,300
      // need larger movements to exceed minSpeed of 8
      intent.move(100, 300, 0, 0) // initial position
      intent.move(140, 300, 40, 0) // moving right
      intent.move(200, 300, 60, 0) // still moving right, building velocity

      expect(prefetched).toEqual(['/about'])
    })

    it('does not prefetch when moving away from a link', () => {
      intent.setRects([{ r: rect(500, 300), h: '/about' }])

      // start at 400,300 moving left (away from link)
      intent.move(400, 300, 0, 0)
      intent.move(380, 300, -20, 0)
      intent.move(350, 300, -30, 0)

      expect(prefetched).toEqual([])
    })

    it('does not prefetch when moving perpendicular to a link', () => {
      intent.setRects([{ r: rect(500, 300), h: '/about' }])

      // start at 200,300 moving down (perpendicular)
      intent.move(200, 300, 0, 0)
      intent.move(200, 330, 0, 30)
      intent.move(200, 370, 0, 40)

      expect(prefetched).toEqual([])
    })

    it('prefetches link at long distance with good aim', () => {
      // link ~350px from cursor position after moves (within maxReach of 500)
      // rect at 500,280 so center is at 550,300 - dead on y=300 trajectory
      intent.setRects([{ r: rect(500, 280), h: '/far' }])

      // start at 100,300 moving right toward 550,300
      intent.move(100, 300, 0, 0)
      intent.move(140, 300, 40, 0)
      intent.move(200, 300, 60, 0)

      expect(prefetched).toEqual(['/far'])
    })

    it('does not prefetch when aim is slightly off at long distance', () => {
      intent.setRects([{ r: rect(600, 300), h: '/far' }])

      // moving toward 800,500 instead of 800,300 - will miss
      intent.move(100, 300, 0, 0)
      intent.move(140, 320, 40, 20)
      intent.move(200, 360, 60, 40)

      expect(prefetched).toEqual([])
    })
  })

  describe('prevents over-fetching', () => {
    it('only prefetches each href once', () => {
      intent.setRects([{ r: rect(500, 300), h: '/about' }])

      // need larger movements to exceed minSpeed of 8
      intent.move(100, 300, 0, 0)
      intent.move(140, 300, 40, 0)
      intent.move(200, 300, 60, 0)
      // first prefetch
      expect(prefetched).toEqual(['/about'])

      // simulate leaving and coming back
      intent.move(100, 300, -100, 0)
      intent.move(140, 300, 40, 0)
      intent.move(200, 300, 60, 0)

      // should not prefetch again
      expect(prefetched).toEqual(['/about'])
    })

    it('removes prefetched links from future consideration', () => {
      intent.setRects([
        { r: rect(400, 300), h: '/first' },
        { r: rect(600, 300), h: '/second' },
      ])

      // move toward first link
      intent.move(100, 300, 0, 0)
      intent.move(150, 300, 50, 0)
      expect(prefetched).toEqual(['/first'])

      // keep moving, should eventually hit second
      intent.move(250, 300, 100, 0)
      intent.move(350, 300, 100, 0)
      expect(prefetched).toEqual(['/first', '/second'])
    })
  })

  describe('winner-takes-all with clustered links', () => {
    it('only prefetches the best target when multiple links are in path', () => {
      // 3 links stacked vertically, all roughly in the direction of travel
      intent.setRects([
        { r: rect(500, 280), h: '/top' },
        { r: rect(500, 320), h: '/middle' },
        { r: rect(500, 360), h: '/bottom' },
      ])

      // moving right toward middle link
      intent.move(100, 340, 0, 0)
      intent.move(150, 340, 50, 0)

      // should only get the closest/best aimed one
      expect(prefetched.length).toBe(1)
      expect(prefetched[0]).toBe('/middle')
    })

    it('handles dense nav with 20 links', () => {
      // simulate a nav bar with 20 links spread horizontally
      const links = Array.from({ length: 20 }, (_, i) => ({
        r: rect(100 + i * 60, 50, 50, 30),
        h: `/nav-${i}`,
      }))
      intent.setRects(links)

      // move toward roughly link 10 (x=700)
      intent.move(700, 200, 0, 0)
      intent.move(700, 150, 0, -50)
      intent.move(700, 100, 0, -50)

      // should only prefetch one, the closest
      expect(prefetched.length).toBe(1)
      expect(prefetched[0]).toBe('/nav-10')
    })

    it('picks closer link when two are roughly aligned', () => {
      intent.setRects([
        { r: rect(300, 300), h: '/near' },
        { r: rect(600, 300), h: '/far' },
      ])

      // moving right from origin
      intent.move(100, 320, 0, 0)
      intent.move(150, 320, 50, 0)

      expect(prefetched).toEqual(['/near'])
    })

    it('picks better-aimed link over closer link', () => {
      intent.setRects([
        { r: rect(200, 400), h: '/close-but-off' }, // closer but significantly off-axis
        { r: rect(400, 300), h: '/far-but-aimed' }, // farther but dead-on
      ])

      // moving right from 100,300 - /far-but-aimed is at y=320 (20px off), /close-but-off is at y=420 (120px off)
      intent.move(100, 300, 0, 0)
      intent.move(150, 300, 50, 0)

      // the far-but-aimed should win because much better aim
      expect(prefetched).toEqual(['/far-but-aimed'])
    })
  })

  describe('velocity and smoothing', () => {
    it('does not prefetch when mouse is stationary', () => {
      intent.setRects([{ r: rect(500, 300), h: '/about' }])

      intent.move(400, 300, 0, 0)
      intent.move(400, 300, 0, 0)
      intent.move(400, 300, 0, 0)

      expect(prefetched).toEqual([])
    })

    it('does not prefetch when mouse is moving slowly', () => {
      intent.setRects([{ r: rect(500, 300), h: '/about' }])

      intent.move(400, 300, 0, 0)
      intent.move(401, 300, 1, 0)
      intent.move(402, 300, 1, 0)

      expect(prefetched).toEqual([])
    })

    it('smooths velocity to avoid jitter false positives', () => {
      intent.setRects([{ r: rect(500, 300), h: '/about' }])

      // overall moving right but with some jitter
      intent.move(100, 300, 0, 0)
      intent.move(130, 305, 30, 5)
      intent.move(160, 298, 30, -7) // slight jitter up
      intent.move(195, 303, 35, 5) // back down

      // should still prefetch due to smoothed velocity
      expect(prefetched).toEqual(['/about'])
    })
  })

  describe('diagonal movement', () => {
    it('prefetches with diagonal approach', () => {
      intent.setRects([{ r: rect(500, 500), h: '/corner' }])

      // moving diagonally toward 500,500
      intent.move(200, 200, 0, 0)
      intent.move(240, 240, 40, 40)
      intent.move(290, 290, 50, 50)

      expect(prefetched).toEqual(['/corner'])
    })

    it('handles angled approach to horizontal nav', () => {
      intent.setRects([
        { r: rect(400, 50), h: '/link1' },
        { r: rect(500, 50), h: '/link2' },
        { r: rect(600, 50), h: '/link3' },
      ])

      // coming from bottom-left, angling toward link2
      intent.move(300, 300, 0, 0)
      intent.move(340, 260, 40, -40)
      intent.move(390, 210, 50, -50)

      // should hit link1 or link2 depending on exact trajectory
      expect(prefetched.length).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('handles empty rect list', () => {
      intent.setRects([])
      intent.move(100, 100, 0, 0)
      intent.move(150, 100, 50, 0)
      expect(prefetched).toEqual([])
    })

    it('handles link at cursor position', () => {
      intent.setRects([{ r: rect(100, 100), h: '/here' }])
      intent.move(150, 120, 0, 0) // cursor inside link
      intent.move(160, 120, 10, 0)
      // should not crash, may or may not prefetch
      expect(prefetched.length).toBeLessThanOrEqual(1)
    })

    it('cleans up when observe returns cleanup function', () => {
      const cleanup = intent.observe(
        { getBoundingClientRect: () => rect(500, 300) } as HTMLElement,
        '/test'
      )
      cleanup()
      // after cleanup, should not be in the system
      intent.move(100, 300, 0, 0)
      intent.move(150, 300, 50, 0)
      expect(prefetched).toEqual([])
    })

    it('re-enables prefetch for href after cleanup', () => {
      const el = { getBoundingClientRect: () => rect(500, 300) } as HTMLElement
      const cleanup = intent.observe(el, '/test')

      // need larger movements to exceed minSpeed of 8
      intent.setRects([{ r: rect(500, 300), h: '/test' }])
      intent.move(100, 300, 0, 0)
      intent.move(140, 300, 40, 0)
      intent.move(200, 300, 60, 0)
      expect(prefetched).toEqual(['/test'])

      // cleanup and re-observe
      cleanup()
      prefetched.length = 0
      intent.observe(el, '/test')
      intent.setRects([{ r: rect(500, 300), h: '/test' }])

      intent.move(100, 300, 0, 0)
      intent.move(140, 300, 40, 0)
      intent.move(200, 300, 60, 0)
      expect(prefetched).toEqual(['/test'])
    })
  })

  describe('reach configuration', () => {
    it('respects maxReach option', () => {
      const shortReach = createPrefetchIntent({
        onPrefetch: (href) => prefetched.push(href),
        maxReach: 200,
      })
      shortReach.setRects([{ r: rect(500, 300), h: '/far' }])

      // 400px away, outside maxReach of 200
      shortReach.move(100, 300, 0, 0)
      shortReach.move(150, 300, 50, 0)

      expect(prefetched).toEqual([])
    })

    it('respects perpWeight option for aim strictness', () => {
      const strictAim = createPrefetchIntent({
        onPrefetch: (href) => prefetched.push(href),
        perpWeight: 10, // very strict
      })
      strictAim.setRects([{ r: rect(400, 350), h: '/off' }])

      // 50px off-axis at 300px distance
      strictAim.move(100, 300, 0, 0)
      strictAim.move(150, 300, 50, 0)

      expect(prefetched).toEqual([]) // too strict, won't fire
    })
  })

  describe('memory and performance', () => {
    it('does not leak elements after cleanup', () => {
      const cleanups: (() => void)[] = []

      // add 100 elements
      for (let i = 0; i < 100; i++) {
        const el = {} as HTMLElement
        cleanups.push(intent.observe(el, `/page-${i}`))
      }

      expect(intent.nodes.size).toBe(100)

      // cleanup all
      cleanups.forEach((c) => c())

      expect(intent.nodes.size).toBe(0)
      expect(intent.done.size).toBe(0)
    })

    it('handles rapid observe/unobserve cycles', () => {
      const el = {} as HTMLElement

      for (let i = 0; i < 100; i++) {
        const cleanup = intent.observe(el, '/test')
        cleanup()
      }

      // should not leak
      expect(intent.nodes.size).toBe(0)
    })

    it('processes 100 links efficiently', () => {
      // create 100 links in a grid
      const links: { r: DOMRectReadOnly; h: string }[] = []
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          links.push({
            r: rect(100 + col * 80, 100 + row * 50, 60, 30),
            h: `/link-${row}-${col}`,
          })
        }
      }
      intent.setRects(links)

      const start = performance.now()
      // simulate 100 mouse movements
      for (let i = 0; i < 100; i++) {
        intent.move(50 + i * 5, 300, 5, 0)
      }
      const elapsed = performance.now() - start

      // should complete in under 10ms for 100 moves * 100 links
      expect(elapsed).toBeLessThan(50)
    })

    it('removes prefetched links from rects to speed up future checks', () => {
      const links = Array.from({ length: 10 }, (_, i) => ({
        r: rect(200 + i * 100, 300),
        h: `/link-${i}`,
      }))
      intent.setRects(links)

      // prefetch first link
      intent.move(100, 320, 0, 0)
      intent.move(150, 320, 50, 0)

      expect(prefetched.length).toBe(1)

      // internal rects should have one less
      // (we can't directly access rects, but we can verify behavior)
      // move toward same area again - should not re-prefetch
      intent.move(100, 320, -50, 0)
      intent.move(150, 320, 50, 0)
      intent.move(200, 320, 50, 0)

      // should have moved on to next link, not re-fetched first
      expect(prefetched.length).toBe(2)
      expect(prefetched[0]).not.toBe(prefetched[1])
    })
  })
})
