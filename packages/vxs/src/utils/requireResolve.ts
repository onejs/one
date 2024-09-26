import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export function requireResolve(name: string) {
  if (typeof import.meta.resolve === 'undefined') {
    return require.resolve(name)
  }
  return import.meta.resolve(name).replace('file://', '')
}
