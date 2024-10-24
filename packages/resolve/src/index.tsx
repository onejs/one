import { fileURLToPath } from 'node:url'
import module from 'node:module'

const resolver =
  'resolve' in import.meta
    ? (path: string) => fileURLToPath(import.meta.resolve(path))
    : 'url' in import.meta
      ? (path: string) => new URL(path, import.meta.url).pathname
      : require.resolve

export const resolvePath = (path: string, from?: string): string => {
  if (from) {
    return resolveFrom(path, from)
  }

  return resolver(path)
}

function resolveFrom(path: string, from: string): string {
  const require = module.createRequire(from)
  return require.resolve(path, { paths: [from] })
}
