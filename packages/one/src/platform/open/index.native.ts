import { Linking, Platform, Share } from 'react-native'
import type { OpenShareContent } from './types'

export type { OpenShareContent } from './types'

// native entry: react native's own Linking and Share modules, so the os
// routes the url and presents its share sheet.
function openURL(url: string): Promise<void> {
  return Linking.openURL(url)
}

async function openShare({ title, message, url }: OpenShareContent): Promise<void> {
  // ios shares a url beside the message; android's share intent carries text
  // only, so the url rides in the message there.
  if (url != null && Platform.OS === 'ios') {
    await Share.share({ title, message, url })
    return
  }
  const text = [message, url].filter(Boolean).join(' ')
  if (!text) throw new Error('openShare: pass a message or a url')
  await Share.share({ title, message: text })
}

function openSettings(): Promise<void> {
  return Linking.openSettings()
}

export const Open = Object.freeze({ openURL, openShare, openSettings })
