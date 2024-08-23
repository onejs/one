export function requireResolve(name: string) {
  if (typeof import.meta.resolve === 'undefined') {
    return require.resolve(name)
  }
  return import.meta.resolve(name)
}
