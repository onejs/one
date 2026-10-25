import {
  CSS_PRELOAD_JS_POSTFIX,
  isNative,
  LOADER_JS_POSTFIX,
  LOADER_JS_POSTFIX_REGEX,
  NATIVE_LOADER_JS_POSTFIX_UNCACHED,
  PRELOAD_JS_POSTFIX,
} from '../constants'
import { getURL } from '../getURL'
import { removeSearch } from './removeSearch'

// Route patterns (`/:param`, `/*`) and concrete param values flow into
// generated artifact filenames. `< > : " | ? *` are reserved on Windows
// filesystems — a leading `:` segment fails outright and a mid-name `:`
// silently writes an NTFS alternate data stream — so encode them as `=hh`
// (hex char code), with literal `=` self-escaped first so decoding is
// unambiguous. Identity for paths without reserved characters.
export function encodeReservedFilenameChars(path: string) {
  return path
    .replaceAll('=', '=3d')
    .replace(
      /[<>:"|?*]/g,
      (char) => `=${char.charCodeAt(0).toString(16).padStart(2, '0')}`
    )
}

export function decodeReservedFilenameChars(path: string) {
  return path.replace(/=([0-9a-f]{2})/g, (_match, hexCode) =>
    String.fromCharCode(Number.parseInt(hexCode, 16))
  )
}

function cleanUrl(path: string) {
  return encodeReservedFilenameChars(
    removeSearch(path).replace(/\/$/, '') // remove trailing slash before encoding
  )
    .replaceAll('_', '__') // escape existing underscores
    .replaceAll('/', '_') // use underscore as path separator
}

const isClient = typeof window !== 'undefined'
const clientSideURL = isClient ? getURL() : ''

export function getPreloadPath(currentPath: string) {
  return `${clientSideURL}/assets/${cleanUrl(currentPath.slice(1))}${PRELOAD_JS_POSTFIX}`
}

export function getPreloadCSSPath(currentPath: string) {
  return `${clientSideURL}/assets/${cleanUrl(currentPath.slice(1))}${CSS_PRELOAD_JS_POSTFIX}`
}

// carries the page's query to the loader of an ssr route, which is the only
// loader that can read it. a reserved key keeps it apart from `platform`.
export const LOADER_SEARCH_PARAM = '__one_search'

// a loader key is the pathname, plus the query when the route is ssr
export function splitLoaderKey(key: string): [path: string, search: string] {
  const index = key.indexOf('?')
  return index === -1 ? [key, ''] : [key.slice(0, index), key.slice(index)]
}

// the same query can be written in several orders and encodings (the url, the
// router state, a link). one canonical form keeps a page's data under one key.
export function toLoaderKey(path: string, search: string) {
  const params = new URLSearchParams(search)
  params.sort()
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

export function appendLoaderQuery(url: string, name: string, value: string) {
  return `${url}${url.includes('?') ? '&' : '?'}${name}=${value}`
}

// the page's query as sent with a loader request, '' when there is none
export function readLoaderSearch(url: URL) {
  const search = url.searchParams.get(LOADER_SEARCH_PARAM)
  return search ? `?${search}` : ''
}

export function getLoaderPath(
  currentPath: string,
  includeUrl = isNative,
  cacheBust?: string,
  search = ''
) {
  const baseURL = includeUrl ? getURL() : ''
  const devPath = process.env.NODE_ENV === 'development' ? '/_one' : ''

  const cacheBustSegment = cacheBust ? `_refetch_${cacheBust}_` : ''

  const loaderPath = `${baseURL}${devPath}/assets/${getLoaderFileStem(currentPath)}${cacheBustSegment}${LOADER_JS_POSTFIX}`
  return search.length > 1
    ? appendLoaderQuery(loaderPath, LOADER_SEARCH_PARAM, encodeURIComponent(search.slice(1)))
    : loaderPath
}

// native prod reads the uncached .native.js copy the build writes beside each loader
export function getNativeLoaderPath(currentPath: string) {
  return `${getURL()}/assets/${getLoaderFileStem(currentPath)}${NATIVE_LOADER_JS_POSTFIX_UNCACHED}`
}

function getLoaderFileStem(currentPath: string) {
  return cleanUrl(new URL(currentPath, 'http://example.com').pathname.slice(1))
}

export function getPathFromLoaderPath(loaderPath: string) {
  return decodeReservedFilenameChars(
    loaderPath
      .replace(LOADER_JS_POSTFIX_REGEX, '')
      .replace(/^(\/_one)?\/assets/, '')
      .replace(/_refetch_\d+_?/, '')
      // decode: __ → _ (escaped underscore), _ → / (path separator)
      .replace(/__|_/g, (match) => (match === '__' ? '_' : '/'))
  )
}
