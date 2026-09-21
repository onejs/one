// web browser result shapes matching expo-web-browser. enums are string
// unions; expo's values are already lowercase or camelcase, so they carry
// over unchanged.
export type BrowserResultType = 'cancel' | 'dismiss' | 'opened' | 'locked'

export interface BrowserResult {
  type: BrowserResultType
}

export interface BrowserRedirectResult {
  type: 'success'
  url: string
}

export type BrowserAuthSessionResult = BrowserRedirectResult | BrowserResult

export type BrowserPresentationStyle =
  | 'automatic'
  | 'currentContext'
  | 'formSheet'
  | 'fullScreen'
  | 'overCurrentContext'
  | 'overFullScreen'
  | 'pageSheet'
  | 'popover'

export interface BrowserOpenOptions {
  // ios only: the modal presentation of the safari sheet.
  presentationStyle?: BrowserPresentationStyle
  // android only: the browser package backing custom tabs.
  browserPackage?: string
  toolbarColor?: string
  controlsColor?: string
  // android only: custom tabs shows the page title.
  showTitle?: boolean
}

export interface BrowserAuthSessionOptions extends BrowserOpenOptions {
  // ios only: request a private authentication session.
  preferEphemeralSession?: boolean
}
