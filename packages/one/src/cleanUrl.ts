import { CACHE_KEY, CLIENT_BASE_URL } from './router/constants'
import { removeSearch } from './utils/removeSearch'

export function cleanUrl(path: string) {
  return (
    removeSearch(path)
      .replaceAll('/', '_')
      // remove trailing _
      .replace(/_$/, '')
  )
}

const clientSideCacheKey = typeof window !== 'undefined' ? `?${CACHE_KEY}` : ''
const clientSideURL = typeof window !== 'undefined' ? CLIENT_BASE_URL : ''

export function getPreloadPath(currentPath: string) {
  return `${clientSideURL}/assets/${cleanUrl(currentPath.slice(1))}_preload.js${clientSideCacheKey}`
}

export function getLoaderPath(currentPath: string) {
  return `${clientSideURL}/assets/${cleanUrl(currentPath.slice(1))}_vxrn_loader.js${clientSideCacheKey}`
}
