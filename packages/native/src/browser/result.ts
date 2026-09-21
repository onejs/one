import type {
  BrowserAuthSessionResult,
  BrowserResult,
  BrowserResultType,
} from './types'

const knownResultTypes: readonly string[] = ['cancel', 'dismiss', 'opened', 'locked']

// native payloads cross the bridge untyped; anything unexpected resolves as
// cancel: the session ended without a redirect or an explicit dismiss.
export function normalizeResultType(value: unknown): BrowserResultType {
  if (typeof value === 'string' && knownResultTypes.includes(value)) {
    return value as BrowserResultType
  }
  return 'cancel'
}

export function normalizeResult(value: unknown): BrowserResult {
  const type =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>).type
      : undefined
  return { type: normalizeResultType(type) }
}

export function normalizeAuthResult(value: unknown): BrowserAuthSessionResult {
  if (value && typeof value === 'object') {
    const { type, url } = value as Record<string, unknown>
    if (type === 'success' && typeof url === 'string') {
      return { type: 'success', url }
    }
    return { type: normalizeResultType(type) }
  }
  return { type: 'cancel' }
}
