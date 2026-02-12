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

/**
 * returns a virtual module id if the specifier is a guard, otherwise null.
 * pure function extracted for testing.
 */
export function resolveEnvironmentGuard(
  specifier: string,
  envName: string
): string | null {
  if (!GUARD_SPECIFIERS.includes(specifier as GuardSpecifier)) {
    return null
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
  const envName = rest.slice(lastColon + 1) as ViteEnvironment

  const allowed = ALLOWED_ENVIRONMENTS[specifier]
  if (!allowed) return null

  if (allowed.includes(envName)) {
    return 'export {}'
  }

  return `throw new Error("${specifier} cannot be imported in the \\"${envName}\\" environment")`
}

export function environmentGuardPlugin(): Plugin {
  return {
    name: 'one:environment-guard',
    enforce: 'pre',

    resolveId(source) {
      const envName = this.environment?.name
      if (!envName) return null
      return resolveEnvironmentGuard(source, envName)
    },

    load(id) {
      return loadEnvironmentGuard(id)
    },
  }
}
