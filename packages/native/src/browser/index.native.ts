import { NitroModules } from 'react-native-nitro-modules'
import type { BrowserAuthResult, OneBrowser } from '../specs/OneBrowser.nitro'
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

// in-app browser matching expo-web-browser: plain pages in a safari sheet or
// custom tab, auth sessions with a redirect result. the OneBrowser nitro
// hybrid object is resolved once and lazily; native owns presentation and
// the session.
let hybrid: OneBrowser | null | undefined

function native(): OneBrowser | null {
  if (hybrid === undefined) {
    hybrid = NitroModules.hasHybridObject('OneBrowser')
      ? NitroModules.createHybridObject<OneBrowser>('OneBrowser')
      : null
  }
  return hybrid
}

// native sets url exactly when the session redirected.
function toAuthSessionResult({ type, url }: BrowserAuthResult): BrowserAuthSessionResult {
  if (type === 'success' && url !== undefined) return { type, url }
  if (type === 'success') throw new Error('Browser.openAuthSession: redirect without a url')
  return { type }
}

function needNative(): Promise<never> {
  return Promise.reject(
    new Error('Browser needs a native build that includes @vxrn/native')
  )
}

function open(url: string, options: BrowserOpenOptions = {}): Promise<BrowserResult> {
  assertBrowserUrl(url, 'Browser.open')
  assertOpenOptions(options, 'Browser.open')
  const resolved = native()
  if (!resolved) return needNative()
  return resolved.open(url, options)
}

function dismiss(): Promise<BrowserResult> {
  const resolved = native()
  if (!resolved) return needNative()
  return resolved.dismiss()
}

function openAuthSession(
  url: string,
  redirectUrl?: string | null,
  options: BrowserAuthSessionOptions = {}
): Promise<BrowserAuthSessionResult> {
  assertBrowserUrl(url, 'Browser.openAuthSession')
  assertRedirectUrl(redirectUrl, 'Browser.openAuthSession')
  assertAuthOptions(options, 'Browser.openAuthSession')
  const resolved = native()
  if (!resolved) return needNative()
  return resolved
    .openAuthSession(url, redirectUrl ?? undefined, options)
    .then(toAuthSessionResult)
}

function dismissAuthSession(): void {
  native()?.dismissAuthSession()
}

export const Browser = Object.freeze({ open, dismiss, openAuthSession, dismissAuthSession })
