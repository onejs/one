import { isNative } from './constants'
import { getURL } from './getURL'
import { CACHE_KEY } from './router/constants'
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
const clientSideSearch = isClient ? `?cache=${CACHE_KEY}` : ''
const clientSideURL = isClient ? getURL() : ''

export function getPreloadPath(currentPath: string) {
  return `${clientSideURL}/assets/${cleanUrl(currentPath.slice(1))}_preload.js${clientSideSearch}`
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

  return `${baseURL}${devPath}/assets/${cleanUrl(currentPathUrl.pathname.slice(1))}_vxrn_loader.js${getSearchParams(currentPathUrl.search)}`
}

export function getPathFromLoaderPath(loaderPath: string) {
  return loaderPath
    .replace('_vxrn_loader.js', '')
    .replace(/^(\/_one)?\/assets/, '')
    .replaceAll(/_/g, '/')
}

function getSearchParams(searchParams) {
  if (!searchParams) {
    return clientSideSearch
  }

  return `${searchParams}&${clientSideSearch.slice(1) /* remove the leading "?" */}`
}
