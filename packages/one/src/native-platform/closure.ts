// packed-artifact closure and module-resolution oracle for the zero-expo
// program. the resolved-dependency inventory fails on forbidden expo
// packages reachable from the app root; the resolution recorder proves at
// runtime that a dynamic import is recorded and that a forbidden expo
// package or workspace source path is rejected.

export const FORBIDDEN_EXPO_EXACT = [
  'expo',
  'expo-modules-core',
  '@expo/config-plugins',
  'babel-preset-expo',
] as const

// matches expo, expo-*, and @expo/* specifiers (including subpaths) without
// matching lookalikes such as exponential.
export function isForbiddenExpoSpecifier(specifier: string): boolean {
  if ((FORBIDDEN_EXPO_EXACT as readonly string[]).includes(specifier)) return true
  if (specifier === 'expo' || specifier.startsWith('expo/')) return true
  if (specifier.startsWith('expo-')) return true
  if (specifier.startsWith('@expo/')) return true
  return false
}

function dependencyNames(
  dependencies: Record<string, string> | string[] | undefined
): string[] {
  if (!dependencies) return []
  return Array.isArray(dependencies) ? dependencies : Object.keys(dependencies)
}

// deterministic inventory: sorted, deduplicated specifier list.
export function resolvedDependencyInventory(
  ...dependencySets: (Record<string, string> | string[] | undefined)[]
): string[] {
  return [...new Set(dependencySets.flatMap(dependencyNames))].sort()
}

// fails on expo, expo-*, @expo/*, expo-modules-core, @expo/config-plugins,
// and babel-preset-expo reachable from the app root.
export function assertDependencyClosure(
  dependencies: Record<string, string> | string[],
  label = 'app root'
): void {
  const names = dependencyNames(dependencies)
  const offenders = [...new Set(names.filter(isForbiddenExpoSpecifier))].sort()
  if (offenders.length > 0) {
    throw new Error(
      `[one closure] forbidden expo packages reachable from ${label}: ${offenders.join(', ')}`
    )
  }
}

export type OneResolutionEvent = {
  type: 'import'
  specifier: string
  source: string
}

export type OneResolutionRecorder = {
  record: (event: OneResolutionEvent) => void
  events: () => OneResolutionEvent[]
  assertNoForbidden: () => void
}

// the recorder the soot cutover lane runs through startup, both deep-link
// paths, auth, and the zero persistence restart at m4.
export function createOneResolutionRecorder(options: {
  forbidSourcePaths?: string[]
} = {}): OneResolutionRecorder {
  const seen: OneResolutionEvent[] = []
  const forbidSourcePaths = options.forbidSourcePaths ?? []
  return {
    record(event) {
      if (isForbiddenExpoSpecifier(event.specifier)) {
        throw new Error(
          `[one resolution] forbidden expo package resolved at runtime: ${event.specifier} (from ${event.source})`
        )
      }
      for (const forbidden of forbidSourcePaths) {
        if (event.source.includes(forbidden)) {
          throw new Error(
            `[one resolution] forbidden source path resolved at runtime: ${event.source}`
          )
        }
      }
      seen.push(event)
    },
    events() {
      return [...seen]
    },
    assertNoForbidden() {
      const offenders = seen.filter((event) => isForbiddenExpoSpecifier(event.specifier))
      if (offenders.length > 0) {
        throw new Error(
          `[one resolution] forbidden expo packages in trace: ${offenders.map((event) => event.specifier).join(', ')}`
        )
      }
    },
  }
}

// fixtures must install produced packages only from tarballs: fail if a
// fixture resolves workspace source.
export function assertNotWorkspaceSource(
  resolvedPath: string,
  workspaceRoots: string[]
): void {
  for (const root of workspaceRoots) {
    if (resolvedPath === root || resolvedPath.startsWith(`${root}/`)) {
      throw new Error(
        `[one closure] fixture resolves workspace source: ${resolvedPath}`
      )
    }
  }
}
