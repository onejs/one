import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createPrefetchViewport } from './prefetchViewport'

// mock IntersectionObserver
let mockIOCallback: IntersectionObserverCallback
const mockObserved = new Set<Element>()

vi.stubGlobal(
  'IntersectionObserver',
  class {
    constructor(callback: IntersectionObserverCallback) {
      mockIOCallback = callback
    }
    observe(el: Element) {
      mockObserved.add(el)
    }
    unobserve(el: Element) {
      mockObserved.delete(el)
    }
    disconnect() {
      mockObserved.clear()
    }
  }
)

function simulateIntersect(el: Element, isIntersecting: boolean) {
  mockIOCallback(
    [{ target: el, isIntersecting } as IntersectionObserverEntry],
    {} as IntersectionObserver
  )
}

describe('prefetchViewport', () => {
  let prefetched: string[]
  let vp: ReturnType<typeof createPrefetchViewport>

  beforeEach(() => {
    prefetched = []
    mockObserved.clear()
    vp = createPrefetchViewport()
    vp.start((href) => prefetched.push(href))
  })

  it('prefetches when link enters viewport', () => {
    const el = {} as HTMLElement
    vp.observe(el, '/about')

    simulateIntersect(el, true)
    expect(prefetched).toEqual(['/about'])
  })

  it('does not prefetch when link exits viewport', () => {
    const el = {} as HTMLElement
    vp.observe(el, '/about')

    simulateIntersect(el, false)
    expect(prefetched).toEqual([])
  })

  it('only prefetches each href once', () => {
    const el = {} as HTMLElement
    vp.observe(el, '/about')

    simulateIntersect(el, true)
    simulateIntersect(el, false)
    simulateIntersect(el, true)

    expect(prefetched).toEqual(['/about'])
  })

  it('cleanup re-enables prefetch for href', () => {
    const el = {} as HTMLElement
    const cleanup = vp.observe(el, '/about')

    simulateIntersect(el, true)
    expect(prefetched).toEqual(['/about'])

    cleanup()
    prefetched.length = 0

    // re-observe same href after cleanup
    vp.observe(el, '/about')
    simulateIntersect(el, true)
    expect(prefetched).toEqual(['/about'])
  })

  describe('memory and performance', () => {
    it('does not leak elements after cleanup', () => {
      const elements: HTMLElement[] = []
      const cleanups: (() => void)[] = []

      // add 100 elements
      for (let i = 0; i < 100; i++) {
        const el = {} as HTMLElement
        elements.push(el)
        cleanups.push(vp.observe(el, `/page-${i}`))
      }

      expect(vp.nodes.size).toBe(100)

      // cleanup all
      cleanups.forEach((c) => c())

      expect(vp.nodes.size).toBe(0)
      expect(vp.done.size).toBe(0)
    })

    it('handles rapid observe/unobserve cycles', () => {
      const el = {} as HTMLElement

      for (let i = 0; i < 100; i++) {
        const cleanup = vp.observe(el, '/test')
        cleanup()
      }

      // should not leak
      expect(vp.nodes.size).toBe(0)
    })
  })
})
