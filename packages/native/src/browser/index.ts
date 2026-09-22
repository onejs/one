import type {
  BrowserAuthSessionOptions,
  BrowserAuthSessionResult,
  BrowserOpenOptions,
  BrowserResult,
} from './types'
import {
  assertAuthOptions,
  assertBrowserUrl,
  assertOpenOptions,
  assertRedirectUrl,
} from './validate'

export type {
  BrowserAuthSessionOptions,
  BrowserAuthSessionResult,
  BrowserOpenOptions,
  BrowserPresentationStyle,
  BrowserRedirectResult,
  BrowserResult,
  BrowserResultType,
} from './types'

// web entry. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms.
function blocked(verb: string): Error {
  const error = new Error(
    `${verb}: the browser blocked the popup. Open it from a user gesture.`
  )
  ;(error as Error & { code: string }).code = 'E_BROWSER_BLOCKED'
  return error
}

function open(url: string, options: BrowserOpenOptions = {}): Promise<BrowserResult> {
  assertBrowserUrl(url, 'Browser.open')
  assertOpenOptions(options, 'Browser.open')
  return openPage(url)
}

async function openPage(url: string): Promise<BrowserResult> {
  if (typeof window === 'undefined') return { type: 'opened' }
  const opened = window.open(url, '_blank')
  if (!opened) throw blocked('Browser.open')
  opened.opener = null
  return { type: 'opened' }
}

async function dismiss(): Promise<BrowserResult> {
  return { type: 'dismiss' }
}

function openAuthSession(
  url: string,
  redirectUrl?: string | null,
  options: BrowserAuthSessionOptions = {}
): Promise<BrowserAuthSessionResult> {
  assertBrowserUrl(url, 'Browser.openAuthSession')
  assertRedirectUrl(redirectUrl, 'Browser.openAuthSession')
  assertAuthOptions(options, 'Browser.openAuthSession')
  return Promise.reject(new Error('Browser.openAuthSession needs an iOS or Android build'))
}

function dismissAuthSession(): void {}

export const Browser = Object.freeze({ open, dismiss, openAuthSession, dismissAuthSession })
