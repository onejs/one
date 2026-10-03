export const ONE_PUBLIC_PREFIX = 'ONE_PUBLIC_'
export const EXPO_PUBLIC_PREFIX = 'EXPO_PUBLIC_'

/**
 * Expose One public values under Expo's established same-suffix names for
 * package compatibility. Explicit Expo values win; Expo input never creates a
 * One-owned name.
 */
export function withExpoPublicEnvAliases<T>(env: Record<string, T>): Record<string, T> {
  const aliased = { ...env }

  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith(ONE_PUBLIC_PREFIX)) continue
    const expoKey = `${EXPO_PUBLIC_PREFIX}${key.slice(ONE_PUBLIC_PREFIX.length)}`
    if (!(expoKey in aliased)) aliased[expoKey] = value
  }

  return aliased
}
