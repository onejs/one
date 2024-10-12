import { fileURLToPath } from 'node:url'

const resolver =
  'resolve' in import.meta
    ? (path: string) => fileURLToPath(import.meta.resolve(path))
    : 'url' in import.meta
      ? (path: string) => new URL(path, import.meta.url).pathname
      : require.resolve

export const resolvePath = (path: string): string => {
  return resolver(path)
}
