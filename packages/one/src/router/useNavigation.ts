import {
  type NavigationProp,
  type ParamListBase,
  useNavigation as useUpstreamNavigation,
} from '@react-navigation/native'
import React from 'react'

import { getReactNavigationRouteName } from '../getReactNavigationConfig'
import { getContextKey, getNameFromFilePath } from './matchers'
import { type RouteNode, useContextKey, useRouteNodes } from './Route'

/**
 * Returns the React Navigation navigation object for the current route.
 * Provides low-level access to navigation actions, events, and screen options.
 *
 * @param parent - Optional path to parent navigator (absolute like `/(tabs)` or relative like `../`)
 * @returns The navigation object with methods like setOptions, addListener, getParent
 * @link https://onestack.dev/docs/api/hooks/useNavigation
 *
 * @example
 * ```tsx
 * const navigation = useNavigation()
 * navigation.setOptions({ title: 'My Screen' })
 * ```
 */
export function useNavigation<T = NavigationProp<ParamListBase>>(parent?: string): T {
  const navigation = useUpstreamNavigation() as any

  const contextKey = useContextKey()
  const routeNodes = useRouteNodes()
  const normalizedParent = React.useMemo(() => {
    if (!parent) {
      return null
    }
    return resolveParentRouteName(routeNodes, contextKey, parent)
  }, [contextKey, parent, routeNodes])

  if (parent && normalizedParent === undefined) {
    throw new Error(
      `Could not find parent navigation with route "${parent}".` +
        ` (normalized context: ${resolveParentId(contextKey, parent)})`
    )
  }

  if (normalizedParent != null) {
    if (normalizedParent === '') {
      let rootNavigation = navigation
      let nextNavigation = rootNavigation.getParent()
      while (nextNavigation) {
        rootNavigation = nextNavigation
        nextNavigation = rootNavigation.getParent()
      }
      return rootNavigation
    }

    const parentNavigation = navigation.getParent(normalizedParent)

    if (!parentNavigation) {
      throw new Error(
        `Could not find parent navigation with route "${parent}".` +
          (normalizedParent !== parent ? ` (normalized: ${normalizedParent})` : '')
      )
    }
    return parentNavigation
  }
  return navigation
}

export function resolveParentId(
  contextKey: string,
  parentId?: string | null
): string | null {
  if (!parentId) {
    return null
  }

  if (parentId.startsWith('.')) {
    return normalizeContextPath(relativePaths(contextKey, parentId))
  }
  return normalizeContextPath(parentId)
}

export function resolveParentRouteName(
  routeNodes: RouteNode[],
  contextKey: string,
  parentId?: string | null
): string | null | undefined {
  const parentContextKey = resolveParentId(contextKey, parentId)
  if (parentContextKey == null) return null
  if (parentContextKey === '/') return ''

  const parentRoute = routeNodes.find(
    (node) => getContextKey(node.contextKey) === parentContextKey
  )
  return parentRoute ? getReactNavigationRouteName(parentRoute) : undefined
}

function normalizeContextPath(path: string): string {
  const normalized = getNameFromFilePath(path)
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/_layout$/, '')
  return normalized ? `/${normalized}` : '/'
}

// Resolve a path like `../` relative to a path like `/foo/bar`
function relativePaths(from: string, to: string): string {
  const fromParts = from.split('/').filter(Boolean)
  const toParts = to.split('/').filter(Boolean)

  for (const part of toParts) {
    if (part === '..') {
      if (fromParts.length === 0) {
        throw new Error(`Cannot resolve path "${to}" relative to "${from}"`)
      }
      fromParts.pop()
    } else if (part === '.') {
      // Ignore
    } else {
      fromParts.push(part)
    }
  }

  return '/' + fromParts.join('/')
}
