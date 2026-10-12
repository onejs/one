// the thrown errors, shared so runtime argument errors read the same on web
// and native. callers test the argument inline and call these only to throw:
// a helper call per verb is measurable on the native hot path.
export function invalidKey(verb: string): never {
  throw new Error(`${verb}: key must be a non-empty string`)
}

export function invalidValue(verb: string): never {
  throw new Error(`${verb}: value must be a string`)
}
