import {
  type NavigationProp,
  useNavigation as useUpstreamNavigation,
} from '@react-navigation/native'
import React from 'react'

import { getNameFromFilePath } from './matchers'
import { useContextKey } from './Route'

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
export function useNavigation<T = NavigationProp<ReactNavigation.RootParamList>>(
  parent?: string
): T {
  const navigation = useUpstreamNavigation<any>()

  const contextKey = useContextKey()
  const normalizedParent = React.useMemo(() => {
    if (!parent) {
      return null
    }
    const normalized = getNameFromFilePath(parent)

    if (parent.startsWith('.')) {
      return relativePaths(contextKey, parent)
    }
    return normalized
  }, [contextKey, parent])

  if (normalizedParent != null) {
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
    return getNameFromFilePath(relativePaths(contextKey, parentId))
  }
  return getNameFromFilePath(parentId)
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
