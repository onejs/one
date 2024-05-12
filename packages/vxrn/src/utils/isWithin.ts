import { relative } from 'node:path'

export function isWithin(outer: string, inner: string) {
  const rel = relative(outer, inner)
  return !rel.startsWith('../') && rel !== '..'
}
