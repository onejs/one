import {
  WebBrowserPresentationStyle,
  WebBrowserResultType,
  type WebBrowserAuthSessionOptions,
  type WebBrowserAuthSessionResult,
  type WebBrowserOpenOptions,
  type WebBrowserResult,
} from './types'

export { WebBrowserPresentationStyle, WebBrowserResultType }
export type {
  WebBrowserAuthSessionOptions,
  WebBrowserAuthSessionResult,
  WebBrowserOpenOptions,
  WebBrowserResult,
}

// web entry. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms.
export async function openBrowserAsync(
  url: string,
  _options: WebBrowserOpenOptions = {}
): Promise<WebBrowserResult> {
  if (typeof window === 'undefined') return { type: WebBrowserResultType.OPENED }
  const opened = window.open(url, '_blank', 'noopener')
  if (!opened) {
    throw new Error('The browser blocked the popup. Open it from a user gesture.')
  }
  return { type: WebBrowserResultType.OPENED }
}

export async function dismissBrowser(): Promise<WebBrowserResult> {
  return { type: WebBrowserResultType.DISMISS }
}

export async function openAuthSessionAsync(
  url: string,
  _redirectUrl?: string | null,
  _options: WebBrowserAuthSessionOptions = {}
): Promise<WebBrowserAuthSessionResult> {
  // web has no auth session equivalent here: open a popup and resolve cancel
  // when the user closes it. redirect capture is out of scope for this
  // small api; native returns the redirect url on success.
  if (typeof window === 'undefined') return { type: WebBrowserResultType.CANCEL }
  const opened = window.open(url, '_blank', 'noopener')
  if (!opened) {
    throw new Error('The browser blocked the popup. Open it from a user gesture.')
  }
  if (opened.closed) return { type: WebBrowserResultType.CANCEL }
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (opened.closed) {
        clearInterval(timer)
        resolve({ type: WebBrowserResultType.CANCEL })
      }
    }, 250)
  })
}
