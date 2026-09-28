// keep runtime argument errors identical on web and native.
export function assertPreferencesKey(key: unknown, verb: string): asserts key is string {
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error(`${verb}: key must be a non-empty string`)
  }
}

export function assertPreferencesValue(value: unknown, verb: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`${verb}: value must be a string`)
  }
}
