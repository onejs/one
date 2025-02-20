/**
 * Contents of this file are partial copies from:
 * https://github.com/vitejs/vite/blob/v6.0.11/packages/vite/src/node/utils.ts
 *
 * We only copy what we need which we can't import directly from vite, with no modifications except of making TypeScript happy.
 */

type MergeWithDefaultsResult<D, V> = any

export function isObject(value: unknown): value is Record<string, any> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export function displayTime(time: number): string {
  // display: {X}ms
  if (time < 1000) {
    return `${time}ms`
  }

  time = time / 1000

  // display: {X}s
  if (time < 60) {
    return `${time.toFixed(2)}s`
  }

  // Calculate total minutes and remaining seconds
  const mins = Math.floor(time / 60)
  const seconds = Math.round(time % 60)

  // Handle case where seconds rounds to 60
  if (seconds === 60) {
    return `${mins + 1}m`
  }

  // display: {X}m {Y}s
  return `${mins}m${seconds < 1 ? '' : ` ${seconds}s`}`
}

const postfixRE = /[?#].*$/
export function cleanUrl(url: string): string {
  return url.replace(postfixRE, '')
}

/**
 * Like `encodeURIPath`, but only replacing `%` as `%25`. This is useful for environments
 * that can handle un-encoded URIs, where `%` is the only ambiguous character.
 */
export function partialEncodeURIPath(uri: string): string {
  if (uri.startsWith('data:')) return uri
  const filePath = cleanUrl(uri)
  const postfix = filePath !== uri ? uri.slice(filePath.length) : ''
  return filePath.replaceAll('%', '%25') + postfix
}

export function joinUrlSegments(a: string, b: string): string {
  if (!a || !b) {
    return a || b || ''
  }
  if (a[a.length - 1] === '/') {
    a = a.substring(0, a.length - 1)
  }
  if (b[0] !== '/') {
    b = '/' + b
  }
  return a + b
}

type DeepWritable<T> = T extends ReadonlyArray<unknown>
  ? { -readonly [P in keyof T]: DeepWritable<T[P]> }
  : T extends RegExp
    ? RegExp
    : T[keyof T] extends Function
      ? T
      : { -readonly [P in keyof T]: DeepWritable<T[P]> }

function deepClone<T>(value: T): DeepWritable<T> {
  if (Array.isArray(value)) {
    return value.map((v) => deepClone(v)) as DeepWritable<T>
  }
  if (isObject(value)) {
    const cloned: Record<string, any> = {}
    for (const key in value) {
      cloned[key] = deepClone(value[key])
    }
    return cloned as DeepWritable<T>
  }
  if (typeof value === 'function') {
    return value as DeepWritable<T>
  }
  if (value instanceof RegExp) {
    return structuredClone(value) as DeepWritable<T>
  }
  if (typeof value === 'object' && value != null) {
    throw new Error('Cannot deep clone non-plain object')
  }
  return value as DeepWritable<T>
}

type MaybeFallback<D, V> = undefined extends V ? Exclude<V, undefined> | D : V

function mergeWithDefaultsRecursively<D extends Record<string, any>, V extends Record<string, any>>(
  defaults: D,
  values: V
): MergeWithDefaultsResult<D, V> {
  const merged: Record<string, any> = defaults
  for (const key in values) {
    const value = values[key]
    // let null to set the value (e.g. `server.watch: null`)
    if (value === undefined) continue

    const existing = merged[key]
    if (existing === undefined) {
      merged[key] = value
      continue
    }

    if (isObject(existing) && isObject(value)) {
      merged[key] = mergeWithDefaultsRecursively(existing, value)
      continue
    }

    // use replace even for arrays
    merged[key] = value
  }
  return merged as MergeWithDefaultsResult<D, V>
}

export function mergeWithDefaults<D extends Record<string, any>, V extends Record<string, any>>(
  defaults: D,
  values: V
): MergeWithDefaultsResult<DeepWritable<D>, V> {
  // NOTE: we need to clone the value here to avoid mutating the defaults
  const clonedDefaults = deepClone(defaults)
  return mergeWithDefaultsRecursively(clonedDefaults, values)
}
