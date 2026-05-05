import { useMemo } from 'react'
import type { OneRouter } from '../interfaces/router'
import type { RouteNode } from './Route'
import { removeSupportedExtensions } from './matchers'
import { routeNode } from './router'
import { sortRoutes } from './sortRoutes'

export type SitemapType = {
  contextKey: string
  filename: string
  href: string | OneRouter.Href
  isInitial: boolean
  isInternal: boolean
  isGenerated: boolean
  children: SitemapType[]
}

export function useSitemap(): SitemapType | null {
  return useMemo(() => getSitemap(routeNode), [routeNode])
}

export function getSitemap(root: RouteNode | null): SitemapType | null {
  return root ? mapRouteToSitemap(root, []) : null
}

function mapRouteToSitemap(route: RouteNode, parents: string[]): SitemapType {
  return {
    contextKey: route.contextKey,
    filename: getRouteFilename(route),
    href: getRouteHref(route, parents),
    isInitial: route.initialRouteName === route.route,
    isInternal: route.internal ?? false,
    isGenerated: route.generated ?? false,
    children: [...route.children]
      .sort(sortRoutes)
      .map((child) => mapRouteToSitemap(child, getRouteSegments(route, parents))),
  }
}

function getRouteSegments(route: RouteNode, parents: string[]) {
  return [...parents, ...route.route.split('/')]
}

// the sitemap exposes route patterns rather than concrete sample URLs:
// dynamic segments stay as `[id]` / `[...slug]`, and `index` collapses to '/'.
// callers wanting clickable links should fill in their own params.
function getRouteHref(route: RouteNode, parents: string[]) {
  const path = getRouteSegments(route, parents)
    .map((segment) => (segment === 'index' ? '' : segment))
    .filter(Boolean)
    .join('/')

  return `/${path}`
}

function getRouteFilename(route: RouteNode) {
  const contextKey = removeSupportedExtensions(route.contextKey)
  const segments = contextKey.split('/')

  if (route.contextKey.match(/_layout\.[jt]sx?$/)) {
    return segments.slice(-2).join('/')
  }

  const routeSegmentsCount = route.route.split('/').length
  return segments.slice(-routeSegmentsCount).join('/')
}
