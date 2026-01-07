export function coerceToArray<A>(thing: A | A[]): A[] {
  return Array.isArray(thing) ? thing : [thing]
}
