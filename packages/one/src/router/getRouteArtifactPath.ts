import { getPathnameFromFilePath } from '../utils/getPathnameFromFilePath'
import { findRouteNodeFromState } from './findRouteNode'
import type { OneLinkingOptions } from './getLinkingConfig'
import type { RouteNode } from './Route'

type Linking = Pick<OneLinkingOptions, 'config' | 'getStateFromPath'>

export function getRouteArtifactPaths(
  href: string,
  linking: Linking | undefined,
  rootNode: RouteNode | null
): { loader: string; preload: string } {
  const fallback = { loader: href, preload: href }
  if (!linking?.getStateFromPath || !rootNode) return fallback

  const state = linking.getStateFromPath(href, linking.config)
  const route = findRouteNodeFromState(state, rootNode)
  if (!route) return fallback

  const pattern = getPathnameFromFilePath(route.contextKey.replace(/^\.\//, '/'))
  if (route.type === 'spa') {
    const hasExplicitSpaMode = route.contextKey
      .split('/')
      .some((segment) => /\+spa(?:\.|$)/.test(segment))
    const path = hasExplicitSpaMode ? pattern : href
    return { loader: path, preload: path }
  }

  return {
    loader: href,
    preload: route.type === 'ssg' ? href : pattern,
  }
}
