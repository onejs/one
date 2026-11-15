// pure mappings for the ios fonts backend: uri scheme classes, the cache
// file extension default, and the benign registration outcomes, matching
// the nitro swift they replace.
export type FontScheme = 'file' | 'remote' | 'unsupported'

export function classifyScheme(scheme: string | null | undefined): FontScheme {
  const normalized = (scheme ?? '').toLowerCase()
  if (normalized === 'file') return 'file'
  if (normalized === 'http' || normalized === 'https') return 'remote'
  return 'unsupported'
}

export function fontExtension(pathExtension: string | null | undefined): string {
  return pathExtension ? pathExtension : 'ttf'
}

// a registration the loader proceeds past: the font was already usable,
// possibly under a different name than requested.
export function isBenignRegisterError(kind: string | null | undefined): boolean {
  return kind === 'alreadyRegistered' || kind === 'duplicatedName'
}
