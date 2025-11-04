import { matchGroupName } from './matchers'
import type { DynamicConvention, RouteNode } from './Route'

function sortDynamicConvention(a: DynamicConvention, b: DynamicConvention) {
  if (a.deep && !b.deep) {
    return 1
  }
  if (!a.deep && b.deep) {
    return -1
  }
  return 0
}

export function sortRoutes(a: RouteNode, b: RouteNode): number {
  const aDynamicSegments = getDynamicSegments(a)
  const bDynamicSegments = getDynamicSegments(b)

  if (aDynamicSegments.length && !bDynamicSegments.length) {
    return 1
  }
  if (!aDynamicSegments.length && bDynamicSegments.length) {
    return -1
  }
  if (aDynamicSegments.length && bDynamicSegments.length) {
    if (aDynamicSegments.length !== bDynamicSegments.length) {
      return bDynamicSegments.length - aDynamicSegments.length
    }

    for (let i = 0; i < aDynamicSegments.length; i++) {
      const aDynamic = aDynamicSegments[i]
      const bDynamic = bDynamicSegments[i]

      if (aDynamic.notFound && bDynamic.notFound) {
        const s = sortDynamicConvention(aDynamic, bDynamic)
        if (s) {
          return s
        }
      }
      if (aDynamic.notFound && !bDynamic.notFound) {
        return 1
      }
      if (!aDynamic.notFound && bDynamic.notFound) {
        return -1
      }

      const s = sortDynamicConvention(aDynamic, bDynamic)
      if (s) {
        return s
      }
    }
    return 0
  }

  const aIndex = a.route === 'index' || matchGroupName(a.route) != null
  const bIndex = b.route === 'index' || matchGroupName(b.route) != null

  if (aIndex && !bIndex) {
    return -1
  }
  if (!aIndex && bIndex) {
    return 1
  }

  return a.route.length - b.route.length
}

function getDynamicSegments(route: RouteNode) {
  return [
    ...(route.dynamic || []),
    ...(route.layouts?.flatMap((layout) => layout.dynamic || []) || []),
  ]
}

export function sortRoutesWithInitial(initialRouteName?: string) {
  return (a: RouteNode, b: RouteNode): number => {
    if (initialRouteName) {
      if (a.route === initialRouteName) {
        return -1
      }
      if (b.route === initialRouteName) {
        return 1
      }
    }
    return sortRoutes(a, b)
  }
}
