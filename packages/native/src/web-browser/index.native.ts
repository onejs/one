import { TurboModuleRegistry, type TurboModule } from 'react-native'
import { normalizeAuthResult, normalizeResult } from './result'
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

// in-app browser matching expo-web-browser: plain pages in a safari sheet or
// custom tab, auth sessions with a redirect result. the native module is
// resolved once and lazily; native owns presentation and the session.
interface WebBrowserSpec extends TurboModule {
  openBrowser(url: string, options: WebBrowserOpenOptions): Promise<{ type: string }>
  dismissBrowser(): Promise<{ type: string }>
  openAuthSession(
    url: string,
    redirectUrl: string | null,
    options: WebBrowserAuthSessionOptions
  ): Promise<{ type: string; url?: string }>
}

let nativeModule: WebBrowserSpec | null | undefined

function native(): WebBrowserSpec {
  if (nativeModule === undefined) {
    nativeModule = TurboModuleRegistry.get<WebBrowserSpec>('OneNativeWebBrowser')
  }
  if (!nativeModule) {
    throw new Error('OneNativeWebBrowser requires a native build with @vxrn/native installed')
  }
  return nativeModule
}

export async function openBrowserAsync(
  url: string,
  options: WebBrowserOpenOptions = {}
): Promise<WebBrowserResult> {
  return normalizeResult(await native().openBrowser(url, options))
}

export async function dismissBrowser(): Promise<WebBrowserResult> {
  return normalizeResult(await native().dismissBrowser())
}

export async function openAuthSessionAsync(
  url: string,
  redirectUrl?: string | null,
  options: WebBrowserAuthSessionOptions = {}
): Promise<WebBrowserAuthSessionResult> {
  return normalizeAuthResult(
    await native().openAuthSession(url, redirectUrl ?? null, options)
  )
}
