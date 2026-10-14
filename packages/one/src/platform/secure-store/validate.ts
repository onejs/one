import type { SecureStoreAccessibility, SecureStoreOptions } from './types'

// shared argument checks: identical checks and messages on web and native.
export function assertSecureStoreKey(key: unknown, verb: string): asserts key is string {
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error(`${verb}: key must be a non-empty string`)
  }
}

export function assertSecureStoreValue(
  value: unknown,
  verb: string
): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`${verb}: value must be a string`)
  }
}

export const SECURE_STORE_ACCESSIBILITIES: readonly SecureStoreAccessibility[] = [
  'afterFirstUnlock',
  'afterFirstUnlockThisDeviceOnly',
  'always',
  'alwaysThisDeviceOnly',
  'whenPasscodeSetThisDeviceOnly',
  'whenUnlocked',
  'whenUnlockedThisDeviceOnly',
]

// validates the caller's options and returns the object native receives:
// the same fields, nothing invented. an absent option stays absent so each
// platform applies its own default.
export function assertSecureStoreOptions(
  options: SecureStoreOptions | undefined,
  verb: string
): SecureStoreOptions {
  if (options === undefined) return {}
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new Error(`${verb}: options must be an object`)
  }
  const { keychainService, keychainAccessible, requireAuthentication, authenticationPrompt, accessGroup } =
    options
  if (keychainService !== undefined && typeof keychainService !== 'string') {
    throw new Error(`${verb}: options.keychainService must be a string`)
  }
  if (
    keychainAccessible !== undefined &&
    !SECURE_STORE_ACCESSIBILITIES.includes(keychainAccessible)
  ) {
    throw new Error(
      `${verb}: options.keychainAccessible must be one of: ${SECURE_STORE_ACCESSIBILITIES.join(', ')}`
    )
  }
  if (requireAuthentication !== undefined && typeof requireAuthentication !== 'boolean') {
    throw new Error(`${verb}: options.requireAuthentication must be a boolean`)
  }
  if (authenticationPrompt !== undefined && typeof authenticationPrompt !== 'string') {
    throw new Error(`${verb}: options.authenticationPrompt must be a string`)
  }
  if (accessGroup !== undefined && typeof accessGroup !== 'string') {
    throw new Error(`${verb}: options.accessGroup must be a string`)
  }
  return options
}
