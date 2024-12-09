import { fileURLToPath } from 'node:url'

const resolver =
  'resolve' in import.meta
    ? (path: string, from?: string) => fileURLToPath(import.meta.resolve(path, from))
    : 'url' in import.meta
      ? (path: string, from?: string) => new URL(path, import.meta.url).pathname
      : require.resolve

export const resolvePath = (path: string, from?: string): string => {
  return resolver(path, from)
}
