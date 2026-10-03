import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
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
// hybrid object is created on first use and cached; native owns presentation
// and the session.
let hybrid: OneBrowser | undefined

function native(): OneBrowser {
  hybrid ??= NitroModules.createHybridObject<OneBrowser>('OneBrowser')
  return hybrid
}

// native sets url exactly when the session redirected.
function toAuthSessionResult({ type, url }: BrowserAuthResult): BrowserAuthSessionResult {
  if (type === 'success' && url !== undefined) return { type, url }
  if (type === 'success') throw new Error('Browser.openAuthSession: redirect without a url')
  return { type }
}

function open(url: string, options: BrowserOpenOptions = {}): Promise<BrowserResult> {
  assertBrowserUrl(url, 'Browser.open')
  assertOpenOptions(options, 'Browser.open')
  return native().open(url, options).catch(rethrowNativeError)
}

function dismiss(): Promise<BrowserResult> {
  return native().dismiss()
}

function openAuthSession(
  url: string,
  redirectUrl?: string | null,
  options: BrowserAuthSessionOptions = {}
): Promise<BrowserAuthSessionResult> {
  assertBrowserUrl(url, 'Browser.openAuthSession')
  assertRedirectUrl(redirectUrl, 'Browser.openAuthSession')
  assertAuthOptions(options, 'Browser.openAuthSession')
  return native()
    .openAuthSession(url, redirectUrl ?? undefined, options)
    .then(toAuthSessionResult, rethrowNativeError)
}

function dismissAuthSession(): void {
  native().dismissAuthSession()
}

function warmup(browserPackage?: string): Promise<boolean> {
  return native().warmup(browserPackage).catch(rethrowNativeError)
}

function mayLaunchUrl(url: string, browserPackage?: string): Promise<boolean> {
  assertBrowserUrl(url, 'Browser.mayLaunchUrl')
  return native().mayLaunchUrl(url, browserPackage).catch(rethrowNativeError)
}

export const Browser = Object.freeze({
  open,
  dismiss,
  openAuthSession,
  dismissAuthSession,
  warmup,
  mayLaunchUrl,
})
