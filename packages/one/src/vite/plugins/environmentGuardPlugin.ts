/**
 * vite plugin that enforces environment guard imports.
 *
 * bare imports like `import 'server-only'` will either be a no-op (allowed)
 * or throw at build/dev time (forbidden) depending on which vite environment
 * is processing the module.
 *
 * | import          | allowed in       | throws in                  |
 * |-----------------|------------------|----------------------------|
 * | server-only     | ssr              | client, ios, android       |
 * | client-only     | client           | ssr, ios, android          |
 * | native-only     | ios, android     | client, ssr                |
 * | web-only        | client, ssr      | ios, android               |
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

const ALLOWED_ENVIRONMENTS: Record<GuardSpecifier, readonly ViteEnvironment[]> = {
  'server-only': ['ssr'],
  'client-only': ['client'],
  'native-only': ['ios', 'android'],
  'web-only': ['client', 'ssr'],
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
 */
export function resolveEnvironmentGuard(
  specifier: string,
  envName: string,
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

  return `${VIRTUAL_PREFIX}${specifier}:${envName}`
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
  const lastColon = rest.lastIndexOf(':')
  if (lastColon === -1) return null

  const specifier = rest.slice(0, lastColon) as GuardSpecifier
  const envName = rest.slice(lastColon + 1)

  // disabled guards always pass
  if (envName === 'disabled') {
    return 'export {}'
  }

  const allowed = ALLOWED_ENVIRONMENTS[specifier]
  if (!allowed) return null

  if (allowed.includes(envName as ViteEnvironment)) {
    return 'export {}'
  }

  return `throw new Error("${specifier} cannot be imported in the \\"${envName}\\" environment")`
}

export function environmentGuardPlugin(options?: EnvironmentGuardOptions): Plugin {
  return {
    name: 'one:environment-guard',
    enforce: 'pre',

    resolveId(source) {
      const envName = this.environment?.name
      if (!envName) return null
      return resolveEnvironmentGuard(source, envName, options)
    },

    load(id) {
      return loadEnvironmentGuard(id)
    },
  }
}
