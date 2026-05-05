export type OneLinkingConfig = {
  /**
   * Custom app scheme or schemes. Each scheme is expanded to double- and
   * triple-slashed URL prefixes.
   */
  scheme?: string | string[]
  /**
   * Fully qualified URL prefixes to strip before matching routes.
   *
   * For host-bearing custom scheme URLs, include the host:
   * `myapp://app`.
   */
  prefixes?: string[]
  filter?: (url: string) => boolean
}

export type NormalizedOneLinkingConfig = {
  prefixes: string[]
  filter?: (url: string) => boolean
}

export function getLinking(config: OneLinkingConfig = {}): OneLinkingConfig {
  return config
}

export function normalizeLinkingConfig(
  config: OneLinkingConfig | undefined,
  defaultPrefixes: string[] = []
): NormalizedOneLinkingConfig {
  // merge: defaults from the native manifest combine with whatever the user
  // provides via scheme/prefixes, so URLs from any registered scheme are
  // recognized even when the user only mentions a subset
  const merged = [
    ...defaultPrefixes,
    ...getSchemePrefixes(config?.scheme),
    ...(config?.prefixes ?? []),
  ]

  return {
    prefixes: dedupe(merged),
    filter: config?.filter,
  }
}

function getSchemePrefixes(scheme: string | string[] | undefined): string[] {
  const schemes = Array.isArray(scheme) ? scheme : scheme ? [scheme] : []

  return schemes.flatMap((value) => {
    const normalized = value.replace(/:\/+$/, '')
    return [`${normalized}://`, `${normalized}:///`]
  })
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}
