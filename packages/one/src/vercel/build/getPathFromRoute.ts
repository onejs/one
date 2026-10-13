import { getPathnameFromFilePath } from '../../utils/getPathnameFromFilePath'
import type { RouteInfo } from '../../vite/types'

export function getPathFromRoute(
  route: RouteInfo<string>,
  options: { includeIndex?: boolean; keepParamBrackets?: boolean } = {}
) {
  return getPathnameFromFilePath(route.file, {}, false, {
    ...options,
    preserveExtensions: true,
  })
    .replace(/^\.\//, '/')
    .replace(/\/+$/, '')
}

/**
 * The path of a route's function in .vercel/output/functions, and of the rewrites to it.
 * Vercel serves a function at its folder's path and reads no param syntax there, so params
 * stay as written ([id], [...slug]): `:` and `*` can't be in a folder name on Windows.
 */
export function getFunctionPathFromRoute(
  route: RouteInfo<string>,
  options: { includeIndex?: boolean } = {}
) {
  return getPathFromRoute(route, { ...options, keepParamBrackets: true })
}
