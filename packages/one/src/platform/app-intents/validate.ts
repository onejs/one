export function assertActionHandler(identifier: string, handler: unknown): void {
  if (typeof identifier !== 'string' || !identifier.trim() || typeof handler !== 'function') {
    throw new TypeError('AppIntents.defineAction requires a non-empty identifier and a function')
  }
}
