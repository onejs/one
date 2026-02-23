import * as React from 'react'
import type { RouteNode } from './router/Route'

// state for inline not-found rendering
export interface NotFoundState {
  // path to the +not-found route to render
  notFoundPath: string
  // the route node to render
  notFoundRouteNode?: RouteNode
  // original path that triggered the 404
  originalPath: string
}

// global not-found state
let currentNotFoundState: NotFoundState | null = null
const notFoundListeners = new Set<() => void>()

export function getNotFoundState(): NotFoundState | null {
  return currentNotFoundState
}

export function setNotFoundState(state: NotFoundState | null) {
  currentNotFoundState = state
  notFoundListeners.forEach((listener) => listener())
}

export function clearNotFoundState() {
  if (currentNotFoundState !== null) {
    currentNotFoundState = null
    notFoundListeners.forEach((listener) => listener())
  }
}

// hook to subscribe to not-found state changes
export function useNotFoundState(): NotFoundState | null {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0)

  React.useEffect(() => {
    notFoundListeners.add(forceUpdate)
    return () => {
      notFoundListeners.delete(forceUpdate)
    }
  }, [])

  return currentNotFoundState
}

// find nearest +not-found route by walking up the route tree from a path
export function findNearestNotFoundRoute(
  pathname: string,
  rootNode: RouteNode | null
): RouteNode | null {
  if (!rootNode) return null

  // normalize pathname
  const pathParts = pathname.split('/').filter(Boolean)

  // recursively search for +not-found at each level
  function findNotFoundInNode(node: RouteNode): RouteNode | null {
    // check if this node itself is a +not-found route
    if (node.route === '+not-found') {
      return node
    }
    // check children for +not-found
    for (const child of node.children || []) {
      if (child.route === '+not-found') {
        return child
      }
    }
    return null
  }

  // traverse tree to find route node matching path, collecting +not-found candidates
  function traverse(
    node: RouteNode,
    depth: number,
    notFoundStack: RouteNode[]
  ): RouteNode | null {
    // check for +not-found at this level
    const notFoundAtLevel = findNotFoundInNode(node)
    if (notFoundAtLevel) {
      notFoundStack.push(notFoundAtLevel)
    }

    // if we've consumed all path parts, return the deepest +not-found found
    if (depth >= pathParts.length) {
      return notFoundStack.length > 0 ? notFoundStack[notFoundStack.length - 1] : null
    }

    const segment = pathParts[depth]

    // find matching child
    for (const child of node.children || []) {
      // skip +not-found routes when matching
      if (child.route === '+not-found') continue

      // check for direct match or dynamic route
      const childRoute = child.route || ''
      const isDynamic = childRoute.startsWith('[')
      const isMatch = childRoute === segment || isDynamic

      if (isMatch) {
        const result = traverse(child, depth + 1, [...notFoundStack])
        if (result) return result
      }
    }

    // no matching child, return deepest +not-found
    return notFoundStack.length > 0 ? notFoundStack[notFoundStack.length - 1] : null
  }

  return traverse(rootNode, 0, [])
}

// find a route node by its path (e.g., "/ssg-not-found/+not-found")
export function findRouteNodeByPath(
  notFoundPath: string,
  rootNode: RouteNode | null
): RouteNode | null {
  if (!rootNode) return null

  // normalize path - remove leading slashes, ./, and trailing slashes
  const normalizedPath = notFoundPath.replace(/^(\.?\/)+|\/+$/g, '')

  // recursive search through all children
  function searchNode(node: RouteNode): RouteNode | null {
    // check if this node's contextKey matches (without extension and prefix)
    const nodeContextKey = node.contextKey || ''
    // strip leading ./ or /, and file extension
    const contextKeyNormalized = nodeContextKey
      .replace(/^(\.?\/)+/, '')
      .replace(/\.[^.]+$/, '')

    if (contextKeyNormalized === normalizedPath) {
      return node
    }

    // check children
    for (const child of node.children || []) {
      const found = searchNode(child)
      if (found) return found
    }

    return null
  }

  // search from root
  const found = searchNode(rootNode)
  if (found) return found

  // also search root's children directly
  for (const child of rootNode.children || []) {
    const found = searchNode(child)
    if (found) return found
  }

  return null
}
