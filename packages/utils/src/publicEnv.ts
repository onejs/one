export const ONE_PUBLIC_PREFIX = 'ONE_PUBLIC_'
export const EXPO_PUBLIC_PREFIX = 'EXPO_PUBLIC_'

/**
 * Keep One and Expo's public env names interchangeable without changing an
 * explicitly supplied value. Only the two public prefixes are aliased.
 */
export function withPublicEnvAliases<T>(env: Record<string, T>): Record<string, T> {
  const aliased = { ...env }

  for (const [key, value] of Object.entries(env)) {
    const counterpart = getPublicEnvCounterpart(key)
    if (counterpart && !Object.prototype.hasOwnProperty.call(env, counterpart)) {
      aliased[counterpart] = value
    }
  }

  return aliased
}

export function getPublicEnvCounterpart(key: string): string | undefined {
  if (key.startsWith(ONE_PUBLIC_PREFIX)) {
    return `${EXPO_PUBLIC_PREFIX}${key.slice(ONE_PUBLIC_PREFIX.length)}`
  }
  if (key.startsWith(EXPO_PUBLIC_PREFIX)) {
    return `${ONE_PUBLIC_PREFIX}${key.slice(EXPO_PUBLIC_PREFIX.length)}`
  }
}
