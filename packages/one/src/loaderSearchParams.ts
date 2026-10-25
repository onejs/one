/**
 * Validates the query of a document request against the search schemas that
 * components under a route use, before the route's loader runs.
 *
 * The build gives a route module `__oneSearchSchemas`, a list of functions that
 * each read one schema. Every schema validates its own copy of the original query,
 * and the outputs are merged into `loaderProps.searchParams`.
 */

import { describeIssues } from './searchParams'
import { isStandardSchema, validateStandardSchemaSync } from './standardSchema'
import type { StandardSchemaV1 } from './standardSchema'
import { parseSearchString, setOwn } from './validateSearchParams'

export type LoaderSearchSchemas = readonly (() => unknown)[]

const resolvedSchemas = new WeakMap<LoaderSearchSchemas, StandardSchemaV1[]>()

export function getLoaderSearchSchemas(routeExported: any): LoaderSearchSchemas | null {
  return routeExported?.__oneSearchSchemas ?? null
}

function resolveSchemas(thunks: LoaderSearchSchemas) {
  let schemas = resolvedSchemas.get(thunks)
  if (!schemas) {
    schemas = thunks.map((read) => {
      const schema = read()
      if (!isStandardSchema(schema)) {
        throw failure(
          500,
          'A schema passed to useSearchParams is not a Standard Schema, so the loader cannot receive validated search params'
        )
      }
      return schema
    })
    resolvedSchemas.set(thunks, schemas)
  }
  return schemas
}

function failure(status: number, message: string) {
  return new Response(message, { status })
}

function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false
  return keys.every(
    (key) =>
      Object.hasOwn(b, key) && isEqual((a as any)[key], (b as Record<string, unknown>)[key])
  )
}

/**
 * Returns the loader props with `searchParams` added, or throws a 400 Response when
 * any schema rejects the query, so a loader never sees unvalidated input.
 */
export function withLoaderSearchParams<Props extends { search?: string } | undefined>(
  thunks: LoaderSearchSchemas,
  loaderProps: Props
): Props & { searchParams: Record<string, unknown> } {
  const searchParams: Record<string, unknown> = {}
  for (const schema of resolveSchemas(thunks)) {
    // a schema may change what it is given, so each one gets its own copy
    let result
    try {
      result = validateStandardSchemaSync(schema, parseSearchString(loaderProps?.search ?? ''))
    } catch (error) {
      throw failure(500, (error as Error).message)
    }
    if (result.issues) {
      throw failure(400, `Invalid search params (${describeIssues(result.issues)})`)
    }
    const value = result.value
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw failure(
        500,
        'A search params schema must produce an object so its keys can be merged'
      )
    }
    for (const key of Object.keys(value)) {
      const next = (value as Record<string, unknown>)[key]
      if (Object.hasOwn(searchParams, key) && !isEqual(searchParams[key], next)) {
        throw failure(
          500,
          `Search param "${key}" is read by more than one schema and they produce different values`
        )
      }
      setOwn(searchParams, key, next)
    }
  }
  return { ...loaderProps, searchParams }
}
