import { isNative, LOADER_JS_POSTFIX, PRELOAD_JS_POSTFIX } from './constants'
import { getURL } from './getURL'
import { removeSearch } from './utils/removeSearch'

function cleanUrl(path: string) {
  return (
    removeSearch(path)
      .replaceAll('/', '_')
      // remove trailing _
      .replace(/_$/, '')
  )
}

const isClient = typeof window !== 'undefined'
const clientSideURL = isClient ? getURL() : ''

export function getPreloadPath(currentPath: string) {
  return `${clientSideURL}/assets/${cleanUrl(currentPath.slice(1))}${PRELOAD_JS_POSTFIX}`
}

export function getLoaderPath(
  currentPath: string,
  // browser can be relative
  includeUrl = isNative
) {
  const baseURL = includeUrl ? getURL() : ''
  const devPath = process.env.NODE_ENV === 'development' ? '/_one' : ''

  const currentPathUrl = new URL(
    currentPath,
    'http://example.com' /* not important, just for `new URL()` to work */
  )

  return `${baseURL}${devPath}/assets/${cleanUrl(currentPathUrl.pathname.slice(1))}${LOADER_JS_POSTFIX}${currentPathUrl.search}`
}

export function getPathFromLoaderPath(loaderPath: string) {
  return loaderPath
    .replace(LOADER_JS_POSTFIX, '')
    .replace(/^(\/_one)?\/assets/, '')
    .replaceAll(/_/g, '/')
}
