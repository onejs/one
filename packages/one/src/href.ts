import type { OneRouter } from './interfaces/router'

/**
 * Type-level utility function to help pass valid Href typed strings.
 * Does not actually validate at runtime, though we could add this later.
 */
export function href<A extends OneRouter.Href>(a: A): A {
  if (!a || typeof a !== 'string') {
    throw new Error(`Invalid href`)
  }
  return a
}
