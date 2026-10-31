/**
 * Reading and writing typed search params.
 *
 * The URL is text. A schema reads it as a record of strings (a repeated key is an
 * array) and returns whatever the schema produces. Going back, a schema cannot turn
 * a value into text, so values are written by one fixed rule: strings, numbers,
 * booleans, or arrays of those, with repeated keys for arrays.
 */

import { validateStandardSchemaSync, type StandardSchemaV1 } from './standardSchema'
import { parseSearchString, SearchValidationError, setOwn } from './validateSearchParams'

/** What a schema receives: every query key, a string or, when repeated, an array. */
export type SearchRecord = Record<string, string | string[]>

type Scalar = string | number | boolean

/** A value that has a defined URL form. */
export type SearchValue = Scalar | readonly Scalar[]

type UpdateValue<Out, In> =
  NonNullable<Out> extends SearchValue ? Out | null | undefined : In

/**
 * What the update function accepts. A field whose output is a plain value is
 * written as that value, and `null` or `undefined` removes the key. A field whose
 * output cannot be written (a Date, an object) takes the schema's input type, the
 * text the schema reads, instead.
 */
export type SearchParamsUpdate<Schema extends StandardSchemaV1> = {
  [K in keyof StandardSchemaV1.InferOutput<Schema>]?: UpdateValue<
    StandardSchemaV1.InferOutput<Schema>[K],
    K extends keyof StandardSchemaV1.InferInput<Schema>
      ? StandardSchemaV1.InferInput<Schema>[K]
      : never
  >
}

export type SearchParamsUpdateOptions = {
  /** Replace the current history entry instead of adding one. Default false. */
  replace?: boolean
}

export type SearchParamsOptions = {
  /** Read the params of the active route even when this one is not focused. */
  global?: boolean
}

export type UseSearchParamsSchemaResult<Schema extends StandardSchemaV1> = readonly [
  StandardSchemaV1.InferOutput<Schema>,
  (update: SearchParamsUpdate<Schema>, options?: SearchParamsUpdateOptions) => void,
]

/**
 * Keeps the query of a params object. Path params, the hash and navigator keys ride
 * in the same object, but the route's href only carries the query, so its keys say
 * which entries to keep.
 */
export function toSearchRecord(
  params: Record<string, unknown>,
  href: string
): SearchRecord {
  const search = href.split('#')[0].split('?')[1] ?? ''
  const queryKeys = new Set(new URLSearchParams(search).keys())
  const record: SearchRecord = {}
  for (const [key, value] of Object.entries(params)) {
    if (value == null || !queryKeys.has(key)) continue
    setOwn(record, key, Array.isArray(value) ? value.map(String) : String(value))
  }
  return record
}

export function searchRecordKey(record: SearchRecord): string {
  return JSON.stringify(record)
}

export function parseSearchRecord<Schema extends StandardSchemaV1>(
  schema: Schema,
  record: SearchRecord
): StandardSchemaV1.InferOutput<Schema> {
  const result = validateStandardSchemaSync(schema, record)
  if (result.issues) {
    throw new SearchValidationError(
      `Invalid search params (${describeIssues(result.issues)})`,
      result.issues as unknown[]
    )
  }
  return result.value
}

export function describeIssues(issues: readonly StandardSchemaV1.Issue[]) {
  return issues
    .map((issue) => {
      const path = issue.path
        ?.map((segment) => String(typeof segment === 'object' ? segment.key : segment))
        .join('.')
      return path ? `${path}: ${issue.message}` : issue.message
    })
    .join('; ')
}

function toStrings(key: string, value: unknown): string[] | undefined {
  if (value == null) return undefined
  const values = Array.isArray(value) ? value : [value]
  for (const item of values) {
    const type = typeof item
    if (type !== 'string' && type !== 'number' && type !== 'boolean') {
      throw new TypeError(
        `Search param "${key}" cannot be written to the URL: expected a string, number, boolean or an array of those, got ${type === 'object' ? (item === null ? 'null' : item.constructor?.name) : type}. Pass the text the schema reads instead.`
      )
    }
  }
  return values.length ? values.map(String) : undefined
}

/**
 * Applies an update onto the current record. Keys the update does not name keep
 * their value and position, a named key with no value is removed.
 */
export function mergeSearchRecord(
  current: SearchRecord,
  update: Record<string, unknown>
): SearchRecord {
  const next: SearchRecord = { ...current }
  for (const [key, value] of Object.entries(update)) {
    const strings = toStrings(key, value)
    if (!strings) {
      delete next[key]
    } else {
      setOwn(next, key, strings.length === 1 && !Array.isArray(value) ? strings[0] : strings)
    }
  }
  return next
}

export function stringifySearchRecord(record: SearchRecord): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(record)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`)
    }
  }
  return parts.join('&')
}

/**
 * Adds search params to an href string. Keys in the update replace the same keys
 * already in the href, the path, other keys and the hash stay.
 */
export function applySearchParams(
  href: string,
  update: Record<string, unknown> | undefined
): string {
  if (!update) return href
  const hashIndex = href.indexOf('#')
  const hash = hashIndex === -1 ? '' : href.slice(hashIndex)
  const withoutHash = hashIndex === -1 ? href : href.slice(0, hashIndex)
  const queryIndex = withoutHash.indexOf('?')
  const path = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex)
  const current = queryIndex === -1 ? {} : parseSearchString(withoutHash.slice(queryIndex + 1))
  const query = stringifySearchRecord(mergeSearchRecord(current, update))
  return `${path}${query ? `?${query}` : ''}${hash}`
}
