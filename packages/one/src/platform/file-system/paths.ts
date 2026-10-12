// posix path helpers plus the uri layer behind Paths, ported from node's
// posix path through expo-file-system's pathUtilities so joined segments,
// encoding and edge cases match expo exactly. the one deliberate fix is
// relative(): expo converts url inputs to pathnames and then ignores them;
// here the converted paths are the ones compared.
//
// node path: Copyright Joyent, Inc. and other Node contributors. Permission
// is hereby granted, free of charge, to any person obtaining a copy of this
// software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions: the above
// copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED
// "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
// NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
// PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN
// AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import type { ParsedPath } from './types'

type UriObject = string | { uri: string }

function uriObjectToString(path: UriObject): string {
  return typeof path === 'string' ? path : path.uri
}

function isPathSeparator(code: string): boolean {
  return code === '/'
}

function normalizeString(path: string, allowAboveRoot: boolean, separator: string): string {
  let res = ''
  let lastSegmentLength = 0
  let lastSlash = -1
  let dots = 0
  let code = ''
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) code = path.charAt(i)
    else if (isPathSeparator(code)) break
    else code = '/'
    if (isPathSeparator(code)) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (dots === 2) {
        if (
          res.length < 2 ||
          lastSegmentLength !== 2 ||
          res.charAt(res.length - 1) !== '.' ||
          res.charAt(res.length - 2) !== '.'
        ) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf(separator)
            if (lastSlashIndex === -1) {
              res = ''
              lastSegmentLength = 0
            } else {
              res = res.slice(0, lastSlashIndex)
              lastSegmentLength = res.length - 1 - res.lastIndexOf(separator)
            }
            lastSlash = i
            dots = 0
            continue
          } else if (res.length !== 0) {
            res = ''
            lastSegmentLength = 0
            lastSlash = i
            dots = 0
            continue
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? `${separator}..` : '..'
          lastSegmentLength = 2
        }
      } else {
        if (res.length > 0) res += `${separator}${path.slice(lastSlash + 1, i)}`
        else res = path.slice(lastSlash + 1, i)
        lastSegmentLength = i - lastSlash - 1
      }
      lastSlash = i
      dots = 0
    } else if (code === '.' && dots !== -1) {
      ++dots
    } else {
      dots = -1
    }
  }
  return res
}

function resolvePath(...args: string[]): string {
  let resolvedPath = ''
  let resolvedAbsolute = false
  for (let i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    const path = i >= 0 ? args[i] : ''
    if (!path || path.length === 0) continue
    resolvedPath = `${path}/${resolvedPath}`
    resolvedAbsolute = !!(path && path.charAt(0) === '/')
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, '/')
  if (resolvedAbsolute) return `/${resolvedPath}`
  return resolvedPath.length > 0 ? resolvedPath : '.'
}

function normalizePath(path: string): string {
  if (path.length === 0) return '.'
  const isAbsolute = path.charAt(0) === '/'
  const trailingSeparator = path.charAt(path.length - 1) === '/'
  path = normalizeString(path, !isAbsolute, '/')
  if (path.length === 0) {
    if (isAbsolute) return '/'
    return trailingSeparator ? './' : '.'
  }
  if (trailingSeparator) path += '/'
  return isAbsolute ? `/${path}` : path
}

function isAbsolutePath(path: string): boolean {
  return path.length > 0 && path.charAt(0) === '/'
}

function joinPaths(...args: string[]): string {
  if (args.length === 0) return '.'
  const path: string[] = []
  for (const arg of args) {
    if (arg && arg.length > 0) path.push(arg)
  }
  if (path.length === 0) return '.'
  return normalizePath(path.join('/'))
}

function relativePaths(from: string, to: string): string {
  if (from === to) return ''
  from = resolvePath(from)
  to = resolvePath(to)
  if (from === to) return ''
  const fromStart = 1
  const fromEnd = from.length
  const fromLen = fromEnd - fromStart
  const toStart = 1
  const toLen = to.length - toStart
  const length = fromLen < toLen ? fromLen : toLen
  let lastCommonSep = -1
  let i = 0
  for (; i < length; i++) {
    const fromChar = from.charAt(fromStart + i)
    if (fromChar !== to.charAt(toStart + i)) break
    else if (fromChar === '/') lastCommonSep = i
  }
  if (i === length) {
    if (toLen > length) {
      if (to.charAt(toStart + i) === '/') return to.slice(toStart + i + 1)
      if (i === 0) return to.slice(toStart + i)
    } else if (fromLen > length) {
      if (from.charAt(fromStart + i) === '/') lastCommonSep = i
      else if (i === 0) lastCommonSep = 0
    }
  }
  let out = ''
  for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
    if (i === fromEnd || from.charAt(i) === '/') {
      out += out.length === 0 ? '..' : '/..'
    }
  }
  return `${out}${to.slice(toStart + lastCommonSep)}`
}

function dirnamePath(path: string): string {
  if (path.length === 0) return '.'
  const hasRoot = path.charAt(0) === '/'
  let end = -1
  let matchedSlash = true
  for (let i = path.length - 1; i >= 1; --i) {
    if (path.charAt(i) === '/') {
      if (!matchedSlash) {
        end = i
        break
      }
    } else {
      matchedSlash = false
    }
  }
  if (end === -1) return hasRoot ? '/' : '.'
  if (hasRoot && end === 1) return '//'
  return path.slice(0, end)
}

function basenamePath(path: string, suffix?: string): string {
  let start = 0
  let end = -1
  let matchedSlash = true
  if (suffix !== undefined && suffix.length > 0 && suffix.length <= path.length) {
    if (suffix === path) return ''
    let extIdx = suffix.length - 1
    let firstNonSlashEnd = -1
    for (let i = path.length - 1; i >= 0; --i) {
      const code = path.charAt(i)
      if (code === '/') {
        if (!matchedSlash) {
          start = i + 1
          break
        }
      } else {
        if (firstNonSlashEnd === -1) {
          matchedSlash = false
          firstNonSlashEnd = i + 1
        }
        if (extIdx >= 0) {
          if (code === suffix.charAt(extIdx)) {
            if (--extIdx === -1) end = i
          } else {
            extIdx = -1
            end = firstNonSlashEnd
          }
        }
      }
    }
    if (start === end) end = firstNonSlashEnd
    else if (end === -1) end = path.length
    return path.slice(start, end)
  }
  for (let i = path.length - 1; i >= 0; --i) {
    if (path.charAt(i) === '/') {
      if (!matchedSlash) {
        start = i + 1
        break
      }
    } else if (end === -1) {
      matchedSlash = false
      end = i + 1
    }
  }
  if (end === -1) return ''
  return path.slice(start, end)
}

function extnamePath(path: string): string {
  let startDot = -1
  let startPart = 0
  let end = -1
  let matchedSlash = true
  let preDotState = 0
  for (let i = path.length - 1; i >= 0; --i) {
    const code = path.charAt(i)
    if (code === '/') {
      if (!matchedSlash) {
        startPart = i + 1
        break
      }
      continue
    }
    if (end === -1) {
      matchedSlash = false
      end = i + 1
    }
    if (code === '.') {
      if (startDot === -1) startDot = i
      else if (preDotState !== 1) preDotState = 1
    } else if (startDot !== -1) {
      preDotState = -1
    }
  }
  if (
    startDot === -1 ||
    end === -1 ||
    preDotState === 0 ||
    (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)
  ) {
    return ''
  }
  return path.slice(startDot, end)
}

function parsePath(path: string): ParsedPath {
  const ret: ParsedPath = { root: '', dir: '', base: '', ext: '', name: '' }
  if (path.length === 0) return ret
  const isAbsolute = path.charAt(0) === '/'
  let start: number
  if (isAbsolute) {
    ret.root = '/'
    start = 1
  } else {
    start = 0
  }
  let startDot = -1
  let startPart = 0
  let end = -1
  let matchedSlash = true
  let i = path.length - 1
  let preDotState = 0
  for (; i >= start; --i) {
    const code = path.charAt(i)
    if (code === '/') {
      if (!matchedSlash) {
        startPart = i + 1
        break
      }
      continue
    }
    if (end === -1) {
      matchedSlash = false
      end = i + 1
    }
    if (code === '.') {
      if (startDot === -1) startDot = i
      else if (preDotState !== 1) preDotState = 1
    } else if (startDot !== -1) {
      preDotState = -1
    }
  }
  if (end !== -1) {
    const baseStart = startPart === 0 && isAbsolute ? 1 : startPart
    if (
      startDot === -1 ||
      preDotState === 0 ||
      (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)
    ) {
      ret.base = ret.name = path.slice(baseStart, end)
    } else {
      ret.name = path.slice(baseStart, startDot)
      ret.base = path.slice(baseStart, end)
      ret.ext = path.slice(startDot, end)
    }
  }
  if (startPart > 0) ret.dir = path.slice(0, startPart - 1)
  else if (isAbsolute) ret.dir = '/'
  return ret
}

const percentRegEx = /%/g
const backslashRegEx = /\\/g
const newlineRegEx = /\n/g
const carriageReturnRegEx = /\r/g
const tabRegEx = /\t/g
const questionRegex = /\?/g
const hashRegex = /#/g
const spaceRegEx = / /g

function encodePathChars(filepath: string): string {
  if (filepath.indexOf('%') !== -1) filepath = filepath.replace(percentRegEx, '%25')
  if (filepath.indexOf('\\') !== -1) filepath = filepath.replace(backslashRegEx, '%5C')
  if (filepath.indexOf('\n') !== -1) filepath = filepath.replace(newlineRegEx, '%0A')
  if (filepath.indexOf('\r') !== -1) filepath = filepath.replace(carriageReturnRegEx, '%0D')
  if (filepath.indexOf('\t') !== -1) filepath = filepath.replace(tabRegEx, '%09')
  if (filepath.indexOf(' ') !== -1) filepath = filepath.replace(spaceRegEx, '%20')
  return filepath
}

function encodeURLChars(path: string): string {
  let resolved = resolvePath(path)
  const filePathLast = path.charAt(path.length - 1)
  if (filePathLast === '/' && resolved[resolved.length - 1] !== '/') resolved += '/'
  resolved = encodePathChars(resolved)
  if (resolved.indexOf('?') !== -1) resolved = resolved.replace(questionRegex, '%3F')
  if (resolved.indexOf('#') !== -1) resolved = resolved.replace(hashRegex, '%23')
  return resolved
}

function isUrl(url: string): boolean {
  try {
    return !!new URL(url)
  } catch {
    return false
  }
}

function asUrl(url: string): URL | null {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    return parsed
  } catch {
    return null
  }
}

export class PathUtilities {
  static join(...paths: UriObject[]): string {
    const [firstSegment = '', ...rest] = paths.map(uriObjectToString)
    const pathAsUrl = asUrl(firstSegment)
    if (pathAsUrl) {
      pathAsUrl.pathname = joinPaths(pathAsUrl.pathname, ...rest.map(encodeURLChars))
      return pathAsUrl.toString()
    }
    return joinPaths(firstSegment, ...rest.map(encodeURLChars))
  }

  static relative(from: UriObject, to: UriObject): string {
    const fromString = uriObjectToString(from)
    const toString = uriObjectToString(to)
    // expo converts url inputs to pathnames here but then compares the
    // originals; comparing the converted paths is the evident intent.
    const fromPath = isUrl(fromString) ? (asUrl(fromString)?.pathname ?? fromString) : fromString
    const toPath = isUrl(toString) ? (asUrl(toString)?.pathname ?? toString) : toString
    return relativePaths(fromPath, toPath)
  }

  static isAbsolute(path: UriObject): boolean {
    const pathString = uriObjectToString(path)
    if (isUrl(pathString)) return true
    return isAbsolutePath(pathString)
  }

  static normalize(path: UriObject): string {
    const pathString = uriObjectToString(path)
    const pathURL = asUrl(encodeURLChars(pathString))
    if (pathURL) {
      pathURL.pathname = encodeURLChars(normalizePath(decodeURIComponent(pathURL.pathname)))
      return pathURL.toString()
    }
    return normalizePath(pathString)
  }

  static dirname(path: UriObject): string {
    const pathString = uriObjectToString(path)
    const pathURL = asUrl(pathString)
    if (pathURL) {
      pathURL.pathname = encodeURLChars(dirnamePath(decodeURIComponent(pathURL.pathname)))
      return pathURL.toString()
    }
    return dirnamePath(pathString)
  }

  static basename(path: UriObject, ext?: string): string {
    const pathString = uriObjectToString(path)
    const pathURL = asUrl(pathString)
    if (pathURL) return basenamePath(decodeURIComponent(pathURL.pathname))
    return basenamePath(pathString, ext)
  }

  static extname(path: UriObject): string {
    const pathString = uriObjectToString(path)
    const pathURL = asUrl(pathString)
    if (pathURL) return extnamePath(decodeURIComponent(pathURL.pathname))
    return extnamePath(pathString)
  }

  static parse(path: UriObject): ParsedPath {
    const pathString = uriObjectToString(path)
    const pathURL = asUrl(pathString)
    if (pathURL) return parsePath(decodeURIComponent(pathURL.pathname))
    return parsePath(pathString)
  }
}
