import path from 'node:path'

const routeFileExtensionRe = /\.[jt]sx?$/

export function isRouteFilePath(filePath: string) {
  return routeFileExtensionRe.test(filePath) && !filePath.endsWith('.d.ts')
}

export function isPathInsideDirectory(filePath: string, directory: string) {
  const relativePath = path.relative(path.resolve(directory), path.resolve(filePath))
  return (
    relativePath !== '' &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
  )
}

export function isRouteFileWatchEvent({
  event,
  filePath,
  routerRoot,
  includeChangeEvents = false,
}: {
  event: string
  filePath: string
  routerRoot: string
  includeChangeEvents?: boolean
}) {
  const isRouteFileEvent =
    event === 'add' ||
    event === 'delete' ||
    event === 'unlink' ||
    (includeChangeEvents && event === 'change')

  return (
    isRouteFileEvent &&
    isPathInsideDirectory(filePath, routerRoot) &&
    isRouteFilePath(filePath)
  )
}
