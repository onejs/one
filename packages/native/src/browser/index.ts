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
  const opened = window.open(url, '_blank', 'noopener')
  if (!opened) throw blocked('Browser.open')
  return { type: 'opened' }
}

async function dismiss(): Promise<BrowserResult> {
  return { type: 'dismiss' }
}

let authPopup: { closed: boolean; close?: () => void } | null = null

function openAuthSession(
  url: string,
  redirectUrl?: string | null,
  options: BrowserAuthSessionOptions = {}
): Promise<BrowserAuthSessionResult> {
  assertBrowserUrl(url, 'Browser.openAuthSession')
  assertRedirectUrl(redirectUrl, 'Browser.openAuthSession')
  assertAuthOptions(options, 'Browser.openAuthSession')
  return openAuthPage(url)
}

async function openAuthPage(url: string): Promise<BrowserAuthSessionResult> {
  // web has no auth session equivalent here: open a popup and resolve cancel
  // when the user closes it. redirect capture is out of scope for this
  // small api; native returns the redirect url on success.
  if (typeof window === 'undefined') return { type: 'cancel' }
  const opened = window.open(url, '_blank', 'noopener')
  if (!opened) throw blocked('Browser.openAuthSession')
  if (opened.closed) return { type: 'cancel' }
  authPopup = opened
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (opened.closed) {
        clearInterval(timer)
        if (authPopup === opened) authPopup = null
        resolve({ type: 'cancel' })
      }
    }, 250)
  })
}

function dismissAuthSession(): void {
  authPopup?.close?.()
  authPopup = null
}

export const Browser = Object.freeze({ open, dismiss, openAuthSession, dismissAuthSession })
