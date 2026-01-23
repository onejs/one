import { useSyncExternalStore } from 'react'
import { useServerContext } from './vite/one-server-only'
import type { One } from './vite/types'

/**
 * Re-export for convenience
 */
export type RouteMatch = One.RouteMatch

// client-side matches store for navigation updates
let clientMatches: RouteMatch[] = []
const clientMatchesListeners = new Set<() => void>()

function subscribeToClientMatches(callback: () => void) {
  clientMatchesListeners.add(callback)
  return () => clientMatchesListeners.delete(callback)
}

function getClientMatchesSnapshot() {
  return clientMatches
}

/**
 * Update the client-side matches store.
 * Called after navigation to update the matches with new loader data.
 * @internal
 */
export function setClientMatches(matches: RouteMatch[]) {
  clientMatches = matches
  for (const listener of clientMatchesListeners) {
    listener()
  }
}

/**
 * Returns an array of all matched routes from root to the current page.
 * Each match contains the route's loader data, params, and route ID.
 *
 * On the server (SSR), this returns the matches computed during the request.
 * On the client, this returns cached matches from hydration or the last navigation.
 *
 * @example
 * ```tsx
 * // In a layout component
 * function DocsLayout({ children }) {
 *   const matches = useMatches()
 *   const pageMatch = matches[matches.length - 1]
 *   const headings = pageMatch?.loaderData?.headings
 *
 *   return (
 *     <div>
 *       <TableOfContents headings={headings} />
 *       {children}
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Building breadcrumbs
 * function Breadcrumbs() {
 *   const matches = useMatches()
 *
 *   return (
 *     <nav>
 *       {matches.map((match) => (
 *         <a key={match.routeId} href={match.pathname}>
 *           {match.loaderData?.title ?? match.routeId}
 *         </a>
 *       ))}
 *     </nav>
 *   )
 * }
 * ```
 */
export function useMatches(): RouteMatch[] {
  const serverContext = useServerContext()

  // on server, return from context directly
  if (process.env.VITE_ENVIRONMENT === 'ssr') {
    return serverContext?.matches ?? []
  }

  // on client, use sync external store for reactivity
  const clientStoreMatches = useSyncExternalStore(
    subscribeToClientMatches,
    getClientMatchesSnapshot,
    // server snapshot for hydration
    () => serverContext?.matches ?? []
  )

  // prefer server context during hydration, then use client store
  return serverContext?.matches ?? clientStoreMatches
}

/**
 * Find a specific match by route ID.
 *
 * @example
 * ```tsx
 * const docsMatch = useMatch('docs/_layout')
 * const navItems = docsMatch?.loaderData?.navItems
 * ```
 */
export function useMatch(routeId: string): RouteMatch | undefined {
  const matches = useMatches()
  return matches.find((m) => m.routeId === routeId)
}

/**
 * Get the current page's match (the last/deepest match).
 *
 * @example
 * ```tsx
 * const pageMatch = usePageMatch()
 * const { title, description } = pageMatch?.loaderData ?? {}
 * ```
 */
export function usePageMatch(): RouteMatch | undefined {
  const matches = useMatches()
  return matches[matches.length - 1]
}
