import { dirname, basename } from 'node:path/posix'

const layoutFile = /^_layout(\+(ssg|ssr|spa))?\.[cm]?[jt]sx?$/

/**
 * The files whose components can read a route's search params: the route itself and
 * the layouts above it. Both the generated link types and the loader validation
 * start from this list, so they find the same schemas.
 *
 * Paths are relative to the router root, like `./(site)/_layout.tsx`.
 */
export function getSearchSchemaEntries(routePaths: string[], contextKey: string) {
  const dir = dirname(contextKey)
  const layouts = routePaths
    .filter((path) => {
      if (path === contextKey || !layoutFile.test(basename(path))) return false
      const layoutDir = dirname(path)
      return layoutDir === '.' || dir === layoutDir || dir.startsWith(`${layoutDir}/`)
    })
    .sort((a, b) => dirname(a).length - dirname(b).length)
  return [contextKey, ...layouts]
}
