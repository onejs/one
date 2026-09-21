import { TurboModuleRegistry, type TurboModule } from 'react-native'
import { normalizeAuthResult, normalizeResult } from './result'
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
// custom tab, auth sessions with a redirect result. the native module is
// resolved once and lazily; native owns presentation and the session.
interface BrowserSpec extends TurboModule {
  open(url: string, options: BrowserOpenOptions): Promise<{ type: string }>
  dismiss(): Promise<{ type: string }>
  openAuthSession(
    url: string,
    redirectUrl: string | null,
    options: BrowserAuthSessionOptions
  ): Promise<{ type: string; url?: string }>
  dismissAuthSession(): void
}

let nativeModule: BrowserSpec | null | undefined

function native(): BrowserSpec | null {
  if (nativeModule === undefined) {
    nativeModule = TurboModuleRegistry.get<BrowserSpec>('OneNativeBrowser')
  }
  return nativeModule
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
  return resolved.open(url, options).then(normalizeResult)
}

function dismiss(): Promise<BrowserResult> {
  const resolved = native()
  if (!resolved) return needNative()
  return resolved.dismiss().then(normalizeResult)
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
  return resolved.openAuthSession(url, redirectUrl ?? null, options).then(normalizeAuthResult)
}

function dismissAuthSession(): void {
  native()?.dismissAuthSession()
}

export const Browser = Object.freeze({ open, dismiss, openAuthSession, dismissAuthSession })
