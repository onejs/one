/** Match `[page]` -> `page` or `[...page]` -> `page` with deep flag */
const dynamicNameRe = /^\[([^[\]]+?)\]$/

export interface DynamicNameMatch {
  name: string
  deep: boolean
}

/** Match `[page]` -> `{ name: 'page', deep: false }` or `[...page]` -> `{ name: 'page', deep: true }` */
export function matchDynamicName(name: string): DynamicNameMatch | undefined {
  const paramName = name.match(dynamicNameRe)?.[1]
  if (paramName == null) {
    return undefined
  } else if (paramName.startsWith('...')) {
    return { name: paramName.slice(3), deep: true }
  } else {
    return { name: paramName, deep: false }
  }
}

/**
 * Match `[...page]` -> `page`
 * @deprecated Use matchDynamicName instead which returns {name, deep}
 */
export function matchDeepDynamicRouteName(name: string): string | undefined {
  return name.match(/^\[\.\.\.([^/]+?)\]$/)?.[1]
}

/** Test `/` -> `page` */
export function testNotFound(name: string): boolean {
  return name.endsWith('+not-found')
}

/** Match `(page)` -> `page` */
export function matchGroupName(name: string): string | undefined {
  return name.match(/^(?:[^\\(\\)])*?\(([^\\/]+)\).*?$/)?.[1]
}

/** Match the first array group name `(a,b,c)/(d,c)` -> `'a,b,c'` */
export function matchArrayGroupName(name: string) {
  return name.match(/(?:[^\\(\\)])*?\(?([^\\/()]+,[^\\/()]+)\)?.*?$/)?.[1]
}

export function getNameFromFilePath(name: string): string {
  return removeSupportedExtensions(removeFileSystemDots(name))
}

export function getContextKey(name: string): string {
  // The root path is `` (empty string) so always prepend `/` to ensure
  // there is some value.
  const normal = '/' + getNameFromFilePath(name)
  if (!normal.endsWith('_layout')) {
    return normal
  }
  return normal.replace(/\/?_layout$/, '')
}

/** Remove `.js`, `.ts`, `.jsx`, `.tsx` */
export function removeSupportedExtensions(name: string): string {
  return name.replace(/(\+(api|spa|ssg|ssr))?\.[jt]sx?$/g, '')
}

// Remove any amount of `./` and `../` from the start of the string
export function removeFileSystemDots(filePath: string): string {
  return filePath.replace(/^(?:\.\.?\/)+/g, '')
}

export function stripGroupSegmentsFromPath(path: string): string {
  return path
    .split('/')
    .reduce((acc, v) => {
      if (matchGroupName(v) == null) {
        acc.push(v)
      }
      return acc
    }, [] as string[])
    .join('/')
}

export function stripInvisibleSegmentsFromPath(path: string): string {
  return stripGroupSegmentsFromPath(path).replace(/\/?index$/, '')
}

/**
 * Match:
 *  - _layout files, +html, +not-found, string+api, etc
 *  - Routes can still use `+`, but it cannot be in the last segment.
 *  - .d.ts files (type definition files)
 */
export function isTypedRoute(name: string) {
  return (
    !name.startsWith('+') &&
    !name.endsWith('.d.ts') &&
    name.match(/(_layout|[^/]*?\+[^/]*?)\.[tj]sx?$/) === null
  )
}

// ============================================
// Directory Render Modes
// ============================================

/** Match directory render mode suffixes: dashboard+ssr, blog+ssg, etc. */
const directoryRenderModeRe = /^(.+)\+(api|ssg|ssr|spa)$/

export interface DirectoryRenderModeMatch {
  /** Directory name without the render mode suffix */
  name: string
  /** The render mode for this directory */
  renderMode: 'api' | 'ssg' | 'ssr' | 'spa'
}

/**
 * Match directory render mode suffixes
 *
 * Examples:
 *   - "dashboard+ssr" -> { name: "dashboard", renderMode: "ssr" }
 *   - "blog+ssg" -> { name: "blog", renderMode: "ssg" }
 *   - "admin+spa" -> { name: "admin", renderMode: "spa" }
 */
export function matchDirectoryRenderMode(name: string): DirectoryRenderModeMatch | undefined {
  const match = name.match(directoryRenderModeRe)
  if (!match) return undefined
  return {
    name: match[1],
    renderMode: match[2] as 'api' | 'ssg' | 'ssr' | 'spa',
  }
}

// ============================================
// Parallel Routes & Intercepting Routes
// ============================================

/** Match @slot directories: @modal, @sidebar, etc. */
const slotPrefixRe = /^@([a-zA-Z][a-zA-Z0-9_-]*)$/

/** Match @modal -> 'modal', @sidebar -> 'sidebar' */
export function matchSlotName(name: string): string | undefined {
  return name.match(slotPrefixRe)?.[1]
}

/** Check if a directory name is a slot directory */
export function isSlotDirectory(name: string): boolean {
  return slotPrefixRe.test(name)
}

export interface InterceptMatch {
  /** Number of levels up (0 = same level, 1 = parent, Infinity = root) */
  levels: number
  /** The actual route path after stripping intercept prefix */
  targetPath: string
  /** Original segment like "(.)photos" or "(..)photos" */
  originalSegment: string
}

/**
 * Match intercept prefixes: (.), (..), (...), (..)(..) etc.
 *
 * Examples:
 *   - "(.)photos" -> { levels: 0, targetPath: "photos" }
 *   - "(..)photos" -> { levels: 1, targetPath: "photos" }
 *   - "(...)photos" -> { levels: Infinity, targetPath: "photos" }
 *   - "(..)(..)photos" -> { levels: 2, targetPath: "photos" }
 */
export function matchInterceptPrefix(segment: string): InterceptMatch | undefined {
  // Match one or more intercept prefixes followed by the target path
  const match = segment.match(/^((?:\(\.{1,3}\))+)(.+)$/)
  if (!match) return undefined

  const [, prefixes, targetPath] = match

  // (...) means from root (Infinity levels)
  if (prefixes.includes('(...)')) {
    return { levels: Infinity, targetPath, originalSegment: segment }
  }

  // Count (..) for levels up, (.) means same level (0)
  const doubleDotMatches = prefixes.match(/\(\.{2}\)/g) || []
  const levels = doubleDotMatches.length

  return { levels, targetPath, originalSegment: segment }
}

/**
 * Strip intercept prefixes from a path segment
 * "(.)photos" -> "photos"
 * "(..)settings" -> "settings"
 */
export function stripInterceptPrefix(segment: string): string {
  const match = matchInterceptPrefix(segment)
  return match ? match.targetPath : segment
}

/**
 * Check if a segment has an intercept prefix
 */
export function hasInterceptPrefix(segment: string): boolean {
  return /^\(\.{1,3}\)/.test(segment)
}

/**
 * Strip slot prefix from path for URL generation
 * Removes @slot segments from path
 */
export function stripSlotSegmentsFromPath(path: string): string {
  return path
    .split('/')
    .filter((segment) => !isSlotDirectory(segment))
    .join('/')
}
