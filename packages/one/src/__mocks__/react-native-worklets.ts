// worklets ships esm with extensionless relative imports, which the platform
// project cannot load; mirror the two apis compose uses with test semantics.
export function isWorkletFunction(value: unknown): boolean {
  return (
    typeof value === 'function' &&
    !!(value as { __workletHash?: unknown }).__workletHash
  )
}

export function runOnUISync<T, A extends unknown[]>(
  worklet: (...args: A) => T,
  ...args: A
): T {
  return worklet(...args)
}
