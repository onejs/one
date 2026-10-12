import type { OpenShareContent } from './types'

export type { OpenShareContent } from './types'

// web entry: a link opens in a new tab without an opener and sharing uses the
// browser's share sheet, as react-native-web's Linking and Share did.
function openURL(url: string): Promise<void> {
  window.open(url, '_blank', 'noopener')
  return Promise.resolve()
}

function openShare({ title, message, url }: OpenShareContent): Promise<void> {
  if (!navigator.share) {
    return Promise.reject(new Error('openShare: this browser has no share sheet'))
  }
  return navigator.share({ title, text: message, url })
}

function openSettings(): Promise<void> {
  return Promise.reject(new Error('openSettings: the web has no app settings page'))
}

export const Open = Object.freeze({ openURL, openShare, openSettings })
