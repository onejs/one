import { assertObject, throwInvalidType } from './asserts.js'
import { skipAssertJSONValue } from './config.js'
import { hasOwn } from './has-own.js'

/** The values that can be represented in JSON */
export type JSONValue = null | string | boolean | number | Array<JSONValue> | JSONObject

/**
 * A JSON object. This is a map from strings to JSON values or `undefined`. We
 * allow `undefined` values as a convenience... but beware that the `undefined`
 * values do not round trip to the server. For example:
 *
 * ```
 * // Time t1
 * await tx.set('a', {a: undefined});
 *
 * // time passes, in a new transaction
 * const v = await tx.get('a');
 * console.log(v); // either {a: undefined} or {}
 * ```
 */
export type JSONObject = { [key: string]: JSONValue | undefined }

/** Like {@link JSONValue} but deeply readonly */
export type ReadonlyJSONValue =
  | null
  | string
  | boolean
  | number
  | ReadonlyArray<ReadonlyJSONValue>
  | ReadonlyJSONObject

/** Like {@link JSONObject} but deeply readonly */
export type ReadonlyJSONObject = {
  readonly [key: string]: ReadonlyJSONValue | undefined
}

/**
 * Checks deep equality of two JSON value with (almost) same semantics as
 * `JSON.stringify`. The only difference is that with `JSON.stringify` the
 * ordering of the properties in an object/map/dictionary matters. In
 * {@link deepEqual} the following two values are consider equal, even though the
 * strings JSON.stringify would produce is different:
 *
 * ```js
 * assert(deepEqual(t({a: 1, b: 2}, {b: 2, a: 1}))
 * ```
 */
export function deepEqual(
  a: ReadonlyJSONValue | undefined,
  b: ReadonlyJSONValue | undefined
): boolean {
  if (a === b) {
    return true
  }

  if (typeof a !== typeof b) {
    return false
  }

  switch (typeof a) {
    case 'boolean':
    case 'number':
    case 'string':
      return false
  }

  // a cannot be undefined here because either a and b are undefined or their
  // types are different.
  // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
  a = a!

  // 'object'
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      return false
    }
    if (a.length !== b.length) {
      return false
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false
      }
    }
    return true
  }

  if (a === null || b === null) {
    return false
  }

  if (Array.isArray(b)) {
    return false
  }

  // We know a and b are objects here but type inference is not smart enough.
  a = a as ReadonlyJSONObject
  b = b as ReadonlyJSONObject

  // We use for-in loops instead of for of Object.keys() to make sure deepEquals
  // does not allocate any objects.

  let aSize = 0
  for (const key in a) {
    if (hasOwn(a, key)) {
      if (!deepEqual(a[key], b[key])) {
        return false
      }
      aSize++
    }
  }

  let bSize = 0
  for (const key in b) {
    if (hasOwn(b, key)) {
      bSize++
    }
  }

  return aSize === bSize
}

export function assertJSONValue(v: unknown): asserts v is JSONValue {
  if (skipAssertJSONValue) {
    return
  }
  switch (typeof v) {
    case 'boolean':
    case 'number':
    case 'string':
      return
    case 'object':
      if (v === null) {
        return
      }
      if (Array.isArray(v)) {
        return assertJSONArray(v)
      }
      return assertObjectIsJSONObject(v as Record<string, unknown>)
  }
  throwInvalidType(v, 'JSON value')
}

export function assertJSONObject(v: unknown): asserts v is JSONObject {
  assertObject(v)
  assertObjectIsJSONObject(v)
}

function assertObjectIsJSONObject(v: Record<string, unknown>): asserts v is JSONObject {
  for (const k in v) {
    if (hasOwn(v, k)) {
      const value = v[k]
      if (value !== undefined) {
        assertJSONValue(value)
      }
    }
  }
}

function assertJSONArray(v: unknown[]): asserts v is JSONValue[] {
  for (const item of v) {
    assertJSONValue(item)
  }
}

interface Path {
  push(key: string | number): void
  pop(): void
}

/**
 * Checks if a value is a JSON value. If there is a value that is not a JSON
 * value, the path parameter is updated to the path of the invalid value.
 */
export function isJSONValue(v: unknown, path: Path): v is JSONValue {
  switch (typeof v) {
    case 'boolean':
    case 'number':
    case 'string':
      return true
    case 'object':
      if (v === null) {
        return true
      }
      if (Array.isArray(v)) {
        return isJSONArray(v, path)
      }
      return objectIsJSONObject(v as Record<string, unknown>, path)
  }
  return false
}

export function isJSONObject(v: unknown, path: Path): v is JSONObject {
  if (typeof v !== 'object' || v === null) {
    return false
  }
  return objectIsJSONObject(v as Record<string, unknown>, path)
}

function objectIsJSONObject(v: Record<string, unknown>, path: Path): v is JSONObject {
  for (const k in v) {
    if (hasOwn(v, k)) {
      path.push(k)
      const value = v[k]
      if (value !== undefined && !isJSONValue(value, path)) {
        return false
      }
      path.pop()
    }
  }
  return true
}

function isJSONArray(v: unknown[], path: Path): v is JSONValue[] {
  for (let i = 0; i < v.length; i++) {
    path.push(i)
    if (!isJSONValue(v[i], path)) {
      return false
    }
    path.pop()
  }
  return true
}

/** Basic deep readonly type. It works for {@link JSONValue} types. */
export type DeepReadonly<T> = T extends null | boolean | string | number | undefined
  ? T
  : { readonly [K in keyof T]: DeepReadonly<T[K]> }
