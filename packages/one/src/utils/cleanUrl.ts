import {
  CSS_PRELOAD_JS_POSTFIX,
  isNative,
  LOADER_JS_POSTFIX,
  LOADER_JS_POSTFIX_REGEX,
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
  return decodeReservedFilenameChars(
    loaderPath
      .replace(LOADER_JS_POSTFIX_REGEX, '')
      .replace(/^(\/_one)?\/assets/, '')
      .replace(/_refetch_\d+_?/, '')
      // decode: __ → _ (escaped underscore), _ → / (path separator)
      .replace(/__|_/g, (match) => (match === '__' ? '_' : '/'))
  )
}
