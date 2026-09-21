import {
  WebBrowserResultType,
  type WebBrowserAuthSessionResult,
  type WebBrowserResult,
} from './types'

// native payloads cross the bridge untyped; anything unexpected resolves as
// cancel: the session ended without a redirect or an explicit dismiss.
export function normalizeResultType(value: unknown): WebBrowserResultType {
  if (
    typeof value === 'string' &&
    (Object.values(WebBrowserResultType) as string[]).includes(value)
  ) {
    return value as WebBrowserResultType
  }
  return WebBrowserResultType.CANCEL
}

export function normalizeResult(value: unknown): WebBrowserResult {
  const type =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>).type
      : undefined
  return { type: normalizeResultType(type) }
}

export function normalizeAuthResult(value: unknown): WebBrowserAuthSessionResult {
  if (value && typeof value === 'object') {
    const { type, url } = value as Record<string, unknown>
    if (type === 'success' && typeof url === 'string') {
      return { type: 'success', url }
    }
    return { type: normalizeResultType(type) }
  }
  return { type: WebBrowserResultType.CANCEL }
}
