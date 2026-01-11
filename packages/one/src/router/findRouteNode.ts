import type { RouteNode } from './Route'

/**
 * Find a RouteNode from the route tree based on the navigation state.
 * Walks through the state's routes recursively to find the deepest matching route.
 */
export function findRouteNodeFromState(
  state: { routes: Array<{ name: string; state?: any }> } | undefined,
  rootNode: RouteNode | null
): RouteNode | null {
  if (!state || !rootNode) {
    return null
  }

  // Get the current route from state (the active one based on index)
  const currentRoute = state.routes[state.routes.length - 1]
  if (!currentRoute) {
    return null
  }

  // Find the matching child node
  const matchingNode = findNodeByRouteName(rootNode, currentRoute.name)
  if (!matchingNode) {
    return null
  }

  // If there's a nested state, continue recursively
  if (currentRoute.state && currentRoute.state.routes) {
    const nestedResult = findRouteNodeFromState(currentRoute.state, matchingNode)
    if (nestedResult) {
      return nestedResult
    }
  }

  return matchingNode
}

/**
 * Find a node by its route name in the tree.
 * Searches children recursively.
 */
function findNodeByRouteName(node: RouteNode, routeName: string): RouteNode | null {
  // Check if this node matches
  if (node.route === routeName) {
    return node
  }

  // Search children
  for (const child of node.children) {
    const found = findNodeByRouteName(child, routeName)
    if (found) {
      return found
    }
  }

  return null
}

/**
 * Extract params from navigation state.
 * Collects params from all routes in the state hierarchy.
 */
export function extractParamsFromState(
  state:
    | { routes: Array<{ name: string; params?: Record<string, any>; state?: any }> }
    | undefined
): Record<string, string | string[]> {
  if (!state) {
    return {}
  }

  const params: Record<string, string | string[]> = {}

  // Collect params from all routes in the state
  for (const route of state.routes) {
    if (route.params) {
      Object.assign(params, route.params)
    }
    // Recurse into nested state
    if (route.state) {
      Object.assign(params, extractParamsFromState(route.state))
    }
  }

  return params
}

/**
 * Extract search params from href string.
 */
export function extractSearchFromHref(href: string): Record<string, string | string[]> {
  const searchIndex = href.indexOf('?')
  if (searchIndex === -1) {
    return {}
  }

  const searchString = href.slice(searchIndex + 1)
  const params: Record<string, string | string[]> = {}
  const searchParams = new URLSearchParams(searchString)

  searchParams.forEach((value, key) => {
    const existing = params[key]
    if (existing === undefined) {
      params[key] = value
    } else if (Array.isArray(existing)) {
      existing.push(value)
    } else {
      params[key] = [existing, value]
    }
  })

  return params
}

/**
 * Extract pathname from href string.
 */
export function extractPathnameFromHref(href: string): string {
  const searchIndex = href.indexOf('?')
  const hashIndex = href.indexOf('#')

  let endIndex = href.length
  if (searchIndex !== -1) endIndex = Math.min(endIndex, searchIndex)
  if (hashIndex !== -1) endIndex = Math.min(endIndex, hashIndex)

  return href.slice(0, endIndex)
}
