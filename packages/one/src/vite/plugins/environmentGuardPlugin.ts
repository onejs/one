/**
 * vite plugin that enforces environment guard imports.
 *
 * bare imports like `import 'server-only'` will either be a no-op (allowed)
 * or throw at build/dev time (forbidden) depending on which vite environment
 * is processing the module.
 *
 * | import          | allowed in       | throws in                  |
 * |-----------------|------------------|----------------------------|
 * | server-only     | any server env   | any client env             |
 * | client-only     | any client env   | any server env             |
 * | native-only     | ios, android     | other names                |
 * | web-only        | client, ssr      | ios, android               |
 *
 * server-only / client-only key off `env.config.consumer` so they work
 * uniformly across `ssr`, custom names like `worker` (cloudflare deploy),
 * or any other consumer-tagged environment a downstream framework defines.
 * native-only / web-only stay name-based because they discriminate by
 * platform, not by consumer type.
 */

import type { Plugin } from 'vite'

const VIRTUAL_PREFIX = '\0one-env-guard:'

const GUARD_SPECIFIERS = [
  'server-only',
  'client-only',
  'native-only',
  'web-only',
] as const

type GuardSpecifier = (typeof GUARD_SPECIFIERS)[number]
type ViteEnvironment = 'client' | 'ssr' | 'ios' | 'android'

const ALLOWED_BY_NAME: Partial<Record<GuardSpecifier, readonly ViteEnvironment[]>> = {
  'native-only': ['ios', 'android'],
  'web-only': ['client', 'ssr'],
}

const ALLOWED_BY_CONSUMER: Partial<Record<GuardSpecifier, 'server' | 'client'>> = {
  'server-only': 'server',
  'client-only': 'client',
}

export type EnvironmentGuardOptions = {
  /**
   * Disable all environment guard checks. When true, all guard imports
   * become no-ops regardless of environment.
   */
  disabled?: boolean

  /**
   * Disable specific guard types. For example, if a library imports
   * 'client-only' but you're only importing utilities that work fine
   * on the server, you can disable just that guard.
   *
   * @example
   * disableGuards: ['client-only']
   */
  disableGuards?: GuardSpecifier[]
}

/**
 * returns a virtual module id if the specifier is a guard, otherwise null.
 * pure function extracted for testing.
 *
 * `consumer` is vite's environment.config.consumer ('server' | 'client').
 * encoded into the virtual id so loadEnvironmentGuard can decide whether
 * server-only / client-only fire without re-deriving it. callers that
 * don't have access to a consumer (legacy callsites, tests) may pass
 * undefined; load will then fall back to name-based matching.
 */
export function resolveEnvironmentGuard(
  specifier: string,
  envName: string,
  consumer?: 'server' | 'client',
  options?: EnvironmentGuardOptions
): string | null {
  if (!GUARD_SPECIFIERS.includes(specifier as GuardSpecifier)) {
    return null
  }

  // if disabled entirely or this specific guard is disabled, mark it as allowed
  if (
    options?.disabled ||
    options?.disableGuards?.includes(specifier as GuardSpecifier)
  ) {
    return `${VIRTUAL_PREFIX}${specifier}:disabled`
  }

  return `${VIRTUAL_PREFIX}${specifier}:${envName}:${consumer ?? 'unknown'}`
}

/**
 * returns the module source for a virtual guard id.
 * pure function extracted for testing.
 */
export function loadEnvironmentGuard(id: string): string | null {
  if (!id.startsWith(VIRTUAL_PREFIX)) {
    return null
  }

  const rest = id.slice(VIRTUAL_PREFIX.length)
  const parts = rest.split(':')

  // legacy 2-part form: `${specifier}:disabled` always passes
  if (parts.length === 2 && parts[1] === 'disabled') {
    return 'export {}'
  }

  const specifier = parts[0] as GuardSpecifier
  const envName = parts[1]
  const consumer = parts[2] as 'server' | 'client' | 'unknown' | undefined

  // server-only / client-only: consumer-based. works for any env name a
  // framework defines (ssr, worker, edge, custom) — the test is "what
  // does vite consider this environment to be consumed by?"
  const requiredConsumer = ALLOWED_BY_CONSUMER[specifier]
  if (requiredConsumer) {
    if (consumer === requiredConsumer) return 'export {}'
    // if consumer wasn't recorded (legacy 2-part form or `unknown`),
    // fall back to the historical name-based behaviour so existing tests
    // keep working without modification.
    if (!consumer || consumer === 'unknown') {
      const legacyAllowed = requiredConsumer === 'server' ? ['ssr'] : ['client']
      if (legacyAllowed.includes(envName)) return 'export {}'
    }
    return `throw new Error("${specifier} cannot be imported in the \\"${envName}\\" environment")`
  }

  // native-only / web-only: name-based.
  const allowedNames = ALLOWED_BY_NAME[specifier]
  if (!allowedNames) return null
  if (allowedNames.includes(envName as ViteEnvironment)) return 'export {}'
  return `throw new Error("${specifier} cannot be imported in the \\"${envName}\\" environment")`
}

export function environmentGuardPlugin(options?: EnvironmentGuardOptions): Plugin {
  return {
    name: 'one:environment-guard',
    enforce: 'pre',

    resolveId(source) {
      const envName = this.environment?.name
      if (!envName) return null
      const consumer = this.environment?.config?.consumer
      return resolveEnvironmentGuard(source, envName, consumer, options)
    },

    load(id) {
      return loadEnvironmentGuard(id)
    },
  }
}
