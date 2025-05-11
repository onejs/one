import { getPathnameFromFilePath } from '../../utils/getPathnameFromFilePath'
import type { RouteInfo } from '../../vite/types'

export function getPathFromRoute(route: RouteInfo<string>) {
  return getPathnameFromFilePath(route.file, {}, false, { preserveExtensions: true })
    .replace(/^\.\//, '/')
    .replace(/\/+$/, '')
}
