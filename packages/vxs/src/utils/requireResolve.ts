import { createRequire } from 'node:module'

export function requireResolve(name: string) {
  if (typeof import.meta.resolve === 'undefined') {
    const require = createRequire(import.meta.url)
    return require.resolve(name)
  }
  return import.meta.resolve(name)
}
