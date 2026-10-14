import { getPathnameFromFilePath } from '../../utils/getPathnameFromFilePath'
import type { RouteInfo } from '../../vite/types'

// the path of a route's function folder and of the rewrites that point at it. vercel
// reads no param syntax from the folder (config.json rewrites do the matching), so
// params stay as written ([id], [...slug]): windows can't create `:` or `*` in a path
export function getPathFromRoute(
  route: RouteInfo<string>,
  options: { includeIndex?: boolean } = {}
) {
  const params: Record<string, string> = {}
  for (const [param, inner] of route.file.matchAll(/\[([^\]]+)\]/g)) {
    params[inner] = params[inner.replace(/^\.\.\./, '')] = param
  }
  return getPathnameFromFilePath(route.file, params, false, {
    ...options,
    preserveExtensions: true,
  })
    .replace(/^\.\//, '/')
    .replace(/\/+$/, '')
}
