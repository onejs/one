import type { BrowserAuthSessionOptions, BrowserOpenOptions } from './types'

const knownPresentationStyles: readonly string[] = [
  'automatic',
  'currentContext',
  'formSheet',
  'fullScreen',
  'overCurrentContext',
  'overFullScreen',
  'pageSheet',
]

// shared argument checks: identical checks and messages on web and native.
export function assertBrowserUrl(url: unknown, verb: string): asserts url is string {
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error(`${verb}: url must be a non-empty string`)
  }
}

export function assertRedirectUrl(
  redirectUrl: unknown,
  verb: string
): asserts redirectUrl is string | null | undefined {
  if (redirectUrl !== undefined && redirectUrl !== null && typeof redirectUrl !== 'string') {
    throw new Error(`${verb}: redirectUrl must be a string or null`)
  }
}

function assertOptionalString(
  options: Record<string, unknown>,
  key: string,
  verb: string
) {
  if (options[key] !== undefined && typeof options[key] !== 'string') {
    throw new Error(`${verb}: ${key} must be a string`)
  }
}

function assertOptionalBoolean(
  options: Record<string, unknown>,
  key: string,
  verb: string
) {
  if (options[key] !== undefined && typeof options[key] !== 'boolean') {
    throw new Error(`${verb}: ${key} must be a boolean`)
  }
}

const knownColorSchemes: readonly string[] = ['system', 'light', 'dark']

export function assertOpenOptions(
  options: unknown,
  verb: string
): asserts options is BrowserOpenOptions | undefined {
  if (options === undefined) return
  if (!options || typeof options !== 'object') {
    throw new Error(`${verb}: options must be an object`)
  }
  const fields = options as Record<string, unknown>
  if (
    fields.presentationStyle !== undefined &&
    (typeof fields.presentationStyle !== 'string' ||
      !knownPresentationStyles.includes(fields.presentationStyle))
  ) {
    throw new Error(
      `${verb}: unknown presentationStyle ${JSON.stringify(fields.presentationStyle)}`
    )
  }
  if (
    fields.colorScheme !== undefined &&
    (typeof fields.colorScheme !== 'string' ||
      !knownColorSchemes.includes(fields.colorScheme))
  ) {
    throw new Error(
      `${verb}: unknown colorScheme ${JSON.stringify(fields.colorScheme)}`
    )
  }
  assertOptionalString(fields, 'browserPackage', verb)
  assertOptionalString(fields, 'toolbarColor', verb)
  assertOptionalString(fields, 'secondaryToolbarColor', verb)
  assertOptionalString(fields, 'controlsColor', verb)
  assertOptionalBoolean(fields, 'showTitle', verb)
}

export function assertAuthOptions(
  options: unknown,
  verb: string
): asserts options is BrowserAuthSessionOptions | undefined {
  assertOpenOptions(options, verb)
  if (options === undefined) return
  assertOptionalBoolean(options as Record<string, unknown>, 'preferEphemeralSession', verb)
}
