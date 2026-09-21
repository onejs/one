export const ONE_PUBLIC_PREFIX = 'ONE_PUBLIC_'
export const EXPO_PUBLIC_PREFIX = 'EXPO_PUBLIC_'

export function withExpoPublicEnvAliases<T>(env: Record<string, T>): Record<string, T> {
  const aliased = { ...env }

  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith(ONE_PUBLIC_PREFIX)) continue
    const expoKey = `${EXPO_PUBLIC_PREFIX}${key.slice(ONE_PUBLIC_PREFIX.length)}`
    if (!(expoKey in aliased)) aliased[expoKey] = value
  }

  return aliased
}
