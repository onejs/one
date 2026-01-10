import {
  CSS_PRELOAD_JS_POSTFIX,
  isNative,
  LOADER_JS_POSTFIX,
  LOADER_JS_POSTFIX_REGEX,
  PRELOAD_JS_POSTFIX,
} from '../constants'
import { getURL } from '../getURL'
import { removeSearch } from './removeSearch'

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

export function getPreloadCSSPath(currentPath: string) {
  return `${clientSideURL}/assets/${cleanUrl(currentPath.slice(1))}${CSS_PRELOAD_JS_POSTFIX}`
}

export function getLoaderPath(
  currentPath: string,
  includeUrl = isNative,
  cacheBust?: string
) {
  const baseURL = includeUrl ? getURL() : ''
  const devPath = process.env.NODE_ENV === 'development' ? '/_one' : ''

  const currentPathUrl = new URL(currentPath, 'http://example.com')

  const cleanedUrl = cleanUrl(currentPathUrl.pathname.slice(1))
  const cacheBustSegment = cacheBust ? `_refetch_${cacheBust}_` : ''

  return `${baseURL}${devPath}/assets/${cleanedUrl}${cacheBustSegment}${LOADER_JS_POSTFIX}`
}

export function getPathFromLoaderPath(loaderPath: string) {
  return loaderPath
    .replace(LOADER_JS_POSTFIX_REGEX, '')
    .replace(/^(\/_one)?\/assets/, '')
    .replace(/_refetch_\d+_/, '')
    .replaceAll(/_/g, '/')
}
