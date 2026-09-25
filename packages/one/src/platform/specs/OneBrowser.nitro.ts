import type { HybridObject } from 'react-native-nitro-modules'
import type { BrowserPresentationStyle, BrowserResult } from '../browser/types'

// the in-app browser behind One.Browser, matching expo-web-browser. pages
// settle with the public BrowserResult; an auth session settles with one flat
// result whose `url` is set only on a redirect ('success'), which the js
// entry narrows to the public union.
export type BrowserAuthResultType = 'cancel' | 'dismiss' | 'opened' | 'locked' | 'success'

export interface BrowserAuthResult {
  type: BrowserAuthResultType
  url?: string
}

// open and auth options in one struct; each platform reads its own fields.
export interface BrowserNativeOptions {
  presentationStyle?: BrowserPresentationStyle
  browserPackage?: string
  toolbarColor?: string
  controlsColor?: string
  showTitle?: boolean
  preferEphemeralSession?: boolean
}

export interface OneBrowser extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  open(url: string, options: BrowserNativeOptions): Promise<BrowserResult>
  dismiss(): Promise<BrowserResult>
  openAuthSession(
    url: string,
    redirectUrl: string | undefined,
    options: BrowserNativeOptions
  ): Promise<BrowserAuthResult>
  dismissAuthSession(): void
}
