// packed-artifact closure and resolution oracle for the zero-expo program.
// fails on forbidden expo packages reachable from the app root and records
// runtime module resolution for positive and negative controls.

export const FORBIDDEN_EXPO_PATTERN_SOURCES = [
  '^expo$',
  '^expo-.*',
  '^@expo/.*',
  '^expo-modules-core$',
  '^@expo/config-plugins$',
  '^babel-preset-expo$',
] as const

const FORBIDDEN_EXPO_PATTERNS = FORBIDDEN_EXPO_PATTERN_SOURCES.map(
  (source) => new RegExp(source)
)

export function isForbiddenExpoSpecifier(specifier: string): boolean {
  const bare = specifier.split('?')[0].split('#')[0]
  const name = bare.startsWith('@')
    ? bare.split('/').slice(0, 2).join('/')
    : bare.split('/')[0]
  return FORBIDDEN_EXPO_PATTERNS.some((pattern) => pattern.test(name))
}

export function findForbiddenDependencies(
  resolved: Record<string, string> | string[]
): string[] {
  const names = Array.isArray(resolved) ? resolved : Object.keys(resolved)
  return [...new Set(names.filter(isForbiddenExpoSpecifier))].sort()
}

export function auditUnpackedManifest(manifest: {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}): string[] {
  return findForbiddenDependencies({
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
  })
}

export type ResolutionEvent = {
  specifier: string
  importer?: string
}

export function createResolutionRecorder() {
  const events: ResolutionEvent[] = []
  return {
    record(specifier: string, importer?: string): void {
      if (isForbiddenExpoSpecifier(specifier)) {
        throw new Error(`[one] forbidden expo specifier resolves: "${specifier}"`)
      }
      if (specifier.includes('/expo/') || specifier.includes('expo-modules-core')) {
        throw new Error(`[one] forbidden expo source path resolves: "${specifier}"`)
      }
      events.push({ specifier, importer })
    },
    events(): ResolutionEvent[] {
      return [...events]
    },
  }
}
