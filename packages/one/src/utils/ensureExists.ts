export function ensureExists<T>(value: T | undefined | null): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(`Missing value.`);
  }
}
