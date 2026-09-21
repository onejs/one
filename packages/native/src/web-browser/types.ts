// web browser result shapes matching expo-web-browser.
export const WebBrowserResultType = {
  CANCEL: 'cancel',
  DISMISS: 'dismiss',
  OPENED: 'opened',
  LOCKED: 'locked',
} as const

export type WebBrowserResultType =
  (typeof WebBrowserResultType)[keyof typeof WebBrowserResultType]

export interface WebBrowserResult {
  type: WebBrowserResultType
}

export interface WebBrowserRedirectResult {
  type: 'success'
  url: string
}

export type WebBrowserAuthSessionResult = WebBrowserRedirectResult | WebBrowserResult

export const WebBrowserPresentationStyle = {
  AUTOMATIC: 'automatic',
  CURRENT_CONTEXT: 'currentContext',
  FORM_SHEET: 'formSheet',
  FULL_SCREEN: 'fullScreen',
  OVER_CURRENT_CONTEXT: 'overCurrentContext',
  OVER_FULL_SCREEN: 'overFullScreen',
  PAGE_SHEET: 'pageSheet',
  POPOVER: 'popover',
} as const

export type WebBrowserPresentationStyle =
  (typeof WebBrowserPresentationStyle)[keyof typeof WebBrowserPresentationStyle]

export interface WebBrowserOpenOptions {
  // ios only: the modal presentation of the safari sheet.
  presentationStyle?: WebBrowserPresentationStyle
  // android only: the browser package backing custom tabs.
  browserPackage?: string
  toolbarColor?: string
  controlsColor?: string
  // android only: custom tabs shows the page title.
  showTitle?: boolean
}

export interface WebBrowserAuthSessionOptions extends WebBrowserOpenOptions {
  // ios only: request a private authentication session.
  preferEphemeralSession?: boolean
}
