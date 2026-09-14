import { useEffect, useRef } from 'react'
import { getURL } from '../getURL'
import { preloadRoute } from '../router/router'

import { shouldPreloadRoute } from '../utils/url'

/**
 * Resolved at build time via vite define - enables tree-shaking of unused modes.
 * Defaults to 'intent' for smart trajectory-based prefetching.
 */
const PREFETCH_MODE = (process.env.ONE_LINK_PREFETCH || 'intent') as
  | 'hover'
  | 'viewport'
  | 'intent'
  | 'false'

/**
 * Handles link prefetching in production builds.
 *
 * Modes:
 * - 'intent': Predicts navigation based on mouse trajectory (default)
 * - 'viewport': Prefetches links when they enter the viewport
 * - 'hover': Prefetches on mouseover
 * - 'false': Disabled
 */
export function getPrefetchableHref(anchor: HTMLAnchorElement, url: string): string | null {
  if (anchor.target && anchor.target !== '_self') return null
  if (anchor.hasAttribute('download')) return null
  if (anchor.getAttribute('rel')?.includes('external')) return null
  const href = anchor.getAttribute('href')
  if (!href) return null
  if (href[0] === '/' || href.startsWith(url)) {
    const cleanHref = href.replace(url, '')
    if (!shouldPreloadRoute(cleanHref)) return null
    return cleanHref
  }
  return null
}

function getHrefFromTarget(url: string, target: EventTarget | null): string | null {
  if (!(target instanceof HTMLElement)) return null
  const anchor = target instanceof HTMLAnchorElement ? target : target.closest('a')
  if (!(anchor instanceof HTMLAnchorElement)) return null
  return getPrefetchableHref(anchor, url)
}

export function PreloadLinks() {
  if (typeof window === 'undefined') {
    return null
  }

  // dev: simple hover prefetch so linkTo can use sync fast-path
  if (!import.meta.env.PROD) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const url = getURL()
      const controller = new AbortController()
      document.addEventListener(
        'mouseover',
        (e) => {
          const href = getHrefFromTarget(url, e.target)
          if (href) preloadRoute(href)
        },
        { passive: true, signal: controller.signal }
      )
      return () => controller.abort()
    }, [])
    return null
  }

  if (PREFETCH_MODE === 'false') {
    return null
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const cleanupRef = useRef<(() => void) | null>(null)

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const url = getURL()

    // hover mode: prefetch on mouseover (default behavior)
    if (PREFETCH_MODE === 'hover') {
      const controller = new AbortController()
      document.addEventListener(
        'mouseover',
        (e) => {
          const href = getHrefFromTarget(url, e.target)
          if (href) preloadRoute(href)
        },
        { passive: true, signal: controller.signal }
      )
      return () => controller.abort()
    }

    // viewport mode: prefetch when links enter viewport
    if (PREFETCH_MODE === 'viewport') {
      import('../link/prefetchViewport').then(
        ({ startPrefetchViewport, observePrefetchViewport }) => {
          startPrefetchViewport(preloadRoute)

          const cleanups: (() => void)[] = []
          const seen = new WeakSet<Element>()

          const observeLinks = () => {
            const links = document.querySelectorAll<HTMLAnchorElement>(
              'a[href^="/"], a[href^="' + url + '"]'
            )
            links.forEach((link) => {
              if (seen.has(link)) return
              seen.add(link)
              const href = getPrefetchableHref(link, url)
              if (href) {
                cleanups.push(
                  observePrefetchViewport(link, href)
                )
              }
            })
          }

          observeLinks()

          // debounced rescan on DOM changes
          let timeout: ReturnType<typeof setTimeout>
          const observer = new MutationObserver(() => {
            clearTimeout(timeout)
            timeout = setTimeout(observeLinks, 100)
          })
          observer.observe(document.body, { childList: true, subtree: true })

          cleanupRef.current = () => {
            clearTimeout(timeout)
            cleanups.forEach((c) => c())
            observer.disconnect()
          }
        }
      )
      return () => cleanupRef.current?.()
    }

    // intent mode: smart prefetch based on mouse trajectory
    if (PREFETCH_MODE === 'intent') {
      const controller = new AbortController()

      import('../link/prefetchIntent').then(
        ({ startPrefetchIntent, observePrefetchIntent }) => {
          startPrefetchIntent(preloadRoute)

          const cleanups: (() => void)[] = []
          const seen = new WeakSet<Element>()

          const observeLinks = () => {
            const links = document.querySelectorAll<HTMLAnchorElement>(
              'a[href^="/"], a[href^="' + url + '"]'
            )
            links.forEach((link) => {
              if (seen.has(link)) return
              seen.add(link)
              const href = getPrefetchableHref(link, url)
              if (href) {
                cleanups.push(
                  observePrefetchIntent(link, href)
                )
              }
            })
          }

          observeLinks()

          // debounced rescan on DOM changes
          let timeout: ReturnType<typeof setTimeout>
          const observer = new MutationObserver(() => {
            clearTimeout(timeout)
            timeout = setTimeout(observeLinks, 100)
          })
          observer.observe(document.body, { childList: true, subtree: true })

          cleanupRef.current = () => {
            clearTimeout(timeout)
            cleanups.forEach((c) => c())
            observer.disconnect()
          }

          // fallback to hover for immediate interaction
          document.addEventListener(
            'mouseover',
            (e) => {
              const href = getHrefFromTarget(url, e.target)
              if (href) preloadRoute(href)
            },
            { passive: true, signal: controller.signal }
          )
        }
      )

      return () => {
        controller.abort()
        cleanupRef.current?.()
      }
    }
  }, [])

  return null
}
