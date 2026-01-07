export function assertIsError(error: unknown): asserts error is Error {
  if (!(error instanceof Error)) {
    throw error;
  }
}

export function assertString(thing: any): asserts thing is string {
  if (typeof thing !== "string") {
    throw `expected string, got ${typeof thing}`;
  }
}
